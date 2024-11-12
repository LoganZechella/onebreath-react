#!/bin/bash
gunicorn --worker-class eventlet --bind 0.0.0.0:$PORT --timeout 60 --workers 1 --threads 2 wsgi:app 