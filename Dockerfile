FROM node:10

COPY . /opt/4m3bot/
RUN cd /opt/4m3bot/ && npm install

CMD ["/opt/4m3bot/run.sh"]
