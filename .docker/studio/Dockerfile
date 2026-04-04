FROM node:22-alpine

ARG SERVICE_NAME=studio
ENV SERVICE_NAME=${SERVICE_NAME}

RUN apk add --no-cache bash zsh

COPY shared/zshrc /etc/zsh/zshrc
COPY shared/bashrc /etc/bash/prompt.sh
