#!/bin/bash
gunicorn --worker-class eventlet -w 1 wsgi:app