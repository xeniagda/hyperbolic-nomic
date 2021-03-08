FROM python:3.8
WORKDIR /usr/src/app/
RUN apt-get update
COPY requirements.txt /usr/src/
RUN pip install -r /usr/src/requirements.txt
CMD [ "python", "api.py" ]
