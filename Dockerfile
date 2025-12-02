FROM python:3.9-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for Pillow)
# RUN apt-get update && apt-get install -y libjpeg-dev zlib1g-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure directories exist
RUN mkdir -p instance static/uploads logs

EXPOSE 5000

# Initialize database (create tables and admin user) and start application
CMD flask init-db && gunicorn -w 4 -b 0.0.0.0:5000 app:app
