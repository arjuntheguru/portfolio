# Stage 1: Build the Hugo site
FROM alpine:latest AS build

RUN apk add --no-cache hugo git

WORKDIR /site

# Copy all source files
COPY . .

# Remove empty theme folder and clone fresh
RUN rm -rf themes/PaperMod && \
    git clone --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod

RUN hugo --minify

# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

WORKDIR /usr/share/nginx/html

COPY --from=build /site/public .

EXPOSE 80/tcp