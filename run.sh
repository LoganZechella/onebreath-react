#!/bin/bash
gunicorn --bind 0.0.0.0:$PORT --timeout 60 --workers 2 --threads 2 wsgi:app 