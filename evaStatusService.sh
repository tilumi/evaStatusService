#!/usr/bin/env bash
cmd=$1
if [ "$cmd" == "start" ]; then
    nohup python -u evaStatusService.py start &
    echo "Server started as process id: "$!
elif [ "$cmd" == "stop" ]; then
    pid=`ps aux | grep 'evaStatusService.py' | grep -v 'grep' | awk '{print $2}'`
    kill -9 $pid
    echo "killed server process: "${pid}
elif [ "$cmd" == "load" ]; then
    python evaStatusService.py load
elif [ "$cmd" == "reset_db" ]; then
    python evaStatusService.py reset_db
else
    echo "usage: evaStatusService.sh [start|stop|load|reset_db]"
fi
