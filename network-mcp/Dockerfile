FROM golang:1.25-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /dibs-network-mcp .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates docker-cli

COPY --from=build /dibs-network-mcp /usr/local/bin/dibs-network-mcp

ENV MCP_PORT=8011
ENV MCP_LISTEN_ALL=true
ENV STAGING_CONTAINER=dibs-staging-dibs-backend-1

EXPOSE 8011

ENTRYPOINT ["dibs-network-mcp"]
