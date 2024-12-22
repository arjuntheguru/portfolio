# Stage 1: Build the Hugo site
FROM alpine:latest as build  

RUN apk add --no-cache hugo

WORKDIR /site

COPY . .

RUN hugo --minify

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

# Set workdir to the NGINX default dir.
WORKDIR /usr/share/nginx/html

# Fixed the source path to match your workdir
COPY --from=build /site/public .  

# Expose port 80
EXPOSE 80/tcp