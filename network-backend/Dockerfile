FROM golang:1.25-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /dibs-network-backend .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

COPY --from=build /dibs-network-backend /usr/local/bin/dibs-network-backend

ENV PORT=8010
ENV LISTEN_ALL=true
ENV DATABASE_PATH=/app/dibs-staging.db
ENV GIN_MODE=release

EXPOSE 8010

ENTRYPOINT ["dibs-network-backend"]
