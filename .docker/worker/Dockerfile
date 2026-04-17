FROM node:22-alpine

ARG SERVICE_NAME=worker
ENV SERVICE_NAME=${SERVICE_NAME}

RUN apk add --no-cache bash zsh git openssh-client

RUN mkdir -p /etc/ssh \
    && ssh-keyscan -H github.com gitlab.com bitbucket.org >> /etc/ssh/ssh_known_hosts 2>/dev/null \
    && chmod 0644 /etc/ssh/ssh_known_hosts

RUN mkdir -p /home/node/.casper && chown 1000:1000 /home/node/.casper

COPY shared/zshrc /etc/zsh/zshrc
COPY shared/bashrc /etc/bash/prompt.sh
