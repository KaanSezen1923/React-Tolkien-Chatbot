from openai import OpenAI
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import base64
import boto3
import time

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

aws_access_key = os.getenv("AWS_ACCESS_KEY")
aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
aws_region = os.getenv("AWS_REGION", "us-east-1")

class ImageGeneratorAgent:
    def __init__(self, api_key):
        self.llm = ChatOpenAI(model="gpt-3.5-turbo", openai_api_key=api_key)
        self.client = OpenAI(api_key=api_key)
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region
        )
        
        self.bucket_name = "generatedimages1923"

        self.summary_system_prompt = """
        You are a summarization assistant. 
        Your task is to take the given text and create a concise, clear, and descriptive summary 
        that can be directly used as a prompt for DALL·E 3 to generate an image.

        Text to summarize:
        {text}

        Guidelines:
        - Focus on key visual details (objects, characters, settings, colors, atmosphere).
        - Be specific and descriptive, avoiding vague words.
        - Remove unnecessary information, keep only what is visually useful.
        - Write in English and in a natural descriptive style suitable for an image prompt.
        - Do not add extra details that are not in the original text.
        """

        self.summary_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", self.summary_system_prompt),
                ("user", "{text}"),
            ]
        )
        self.summary_chain = self.summary_prompt | self.llm

    def summarize_for_dalle(self, text):
        response = self.summary_chain.invoke({"text": text})
        return response.content

    def generate_image(self, prompt):
        response = self.client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            n=1,
            size="1024x1024",
            response_format="b64_json"
        )
        return response.data[0].b64_json
    
    def upload_to_s3(self, file_bytes, filename):
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=filename,
            Body=file_bytes,
            ContentType="image/png"
        )
        return f"https://{self.bucket_name}.s3.{aws_region}.amazonaws.com/{filename}"


    def run(self, text):
        dalle_prompt = self.summarize_for_dalle(text)
        image = self.generate_image(dalle_prompt)
        image_bytes=base64.b64decode(image)
        unix_time= int(time.time())
        filename=f"{unix_time}.png"
        s3_url = self.upload_to_s3(image_bytes, filename)

        print(f"Image uploaded to {s3_url}")
            
        return {
            "dalle_prompt": dalle_prompt,
            "image_url": s3_url
        }