FROM alpine:latest

RUN apk add --no-cache hugo

WORKDIR /site

COPY . /site

EXPOSE 1313

CMD ["hugo", "server", "--bind=0.0.0.0", "--port=1313", "--disableFastRender"]