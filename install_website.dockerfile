FROM nginx:latest
COPY Front-End/ /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
