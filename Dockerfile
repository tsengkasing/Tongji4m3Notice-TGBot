FROM ubuntu:18.04
RUN apt-get update \
	&& apt-get upgrade -y \
	&& apt-get install -y \
	&& rm -rf /var/lib/apt/lists/* 

COPY lib/ /opt/4m3bot/lib/
COPY index.js /opt/4m3bot/index.js
COPY run.sh /opt/4m3bot/run.sh

ENTRYPOINT ["/opt/4m3bot/run.sh"]
