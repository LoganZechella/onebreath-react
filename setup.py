from setuptools import setup, find_namespace_packages

setup(
    name="server",
    version="1.0.0",
    packages=find_namespace_packages(include=['src.*']),
    install_requires=[
        'flask',
        'flask-cors',
        'flask-mail',
        'firebase-admin',
        'google-cloud-storage',
        'pymongo',
        'openai',
        'python-dotenv',
        'twilio',
        'gunicorn'
    ],
) 