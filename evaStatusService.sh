#!/usr/bin/env bash
cmd=$1

function start_server {
    pid=`ps aux | grep 'evaStatusService.py' | grep -v 'grep' | awk '{print $2}'`
    if [ -n "$pid" ]; then
        echo "server is running, stop it first"
    else
        nohup python -u evaStatusService.py start &
        echo "Server started as process id: "$!
    fi
}

function stop_server {
    pid=`ps aux | grep 'evaStatusService.py' | grep -v 'grep' | awk '{print $2}'`
    if [ -n "$pid" ]; then
        kill -9 $pid
        echo "killed server process: "${pid}
    else
        echo "server is not running"
    fi
}

if [ "$cmd" == "start" ]; then
    start_server
elif [ "$cmd" == "stop" ]; then
    stop_server
elif [ "$cmd" == "restart" ]; then
    stop_server
    start_server
elif [ "$cmd" == "load" ]; then
    python evaStatusService.py load
elif [ "$cmd" == "reset_db" ]; then
    python evaStatusService.py reset_db
else
    echo "usage: evaStatusService.sh [start|stop|load|reset_db]"
fi
