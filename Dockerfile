# 3.3 required for --no-cache option to apk
FROM alpine:3.7

# Install nodejs and npm
RUN apk add --no-cache nodejs nodejs-npm

# Install node modules we're using
RUN npm install --save express compression helmet three

COPY *.js   ./
COPY *.html ./

EXPOSE  3000
CMD ["node", "server.js", "EasyVis.html"]

