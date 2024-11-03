from setuptools import setup, find_namespace_packages

setup(
    name="server",
    version="1.0.0",
    packages=find_namespace_packages(include=['src.*']),
    python_requires='>=3.11.0',
    install_requires=[
        'Flask>=3.0.2',
        'Flask-CORS>=4.0.0',
        'Flask-Mail>=0.9.1',
        'firebase-admin>=6.4.0',
        'google-cloud-storage>=2.14.0',
        'pymongo>=4.6.2',
        'openai>=1.14.1',
        'python-dotenv>=1.0.1',
        'twilio>=9.0.0',
        'gunicorn>=21.2.0'
    ],
) 