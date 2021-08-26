FROM debian as build

RUN apt-get update -y
RUN apt-get install -y wget
RUN wget --recursive https://html5zombo.com

FROM nginx
COPY --from=build /html5zombo.com /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf