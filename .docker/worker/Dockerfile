FROM node:22-alpine

ARG SERVICE_NAME=worker
ENV SERVICE_NAME=${SERVICE_NAME}

RUN apk add --no-cache bash zsh git

RUN mkdir -p /home/node/.casper && chown 1000:1000 /home/node/.casper

COPY shared/zshrc /etc/zsh/zshrc
COPY shared/bashrc /etc/bash/prompt.sh
