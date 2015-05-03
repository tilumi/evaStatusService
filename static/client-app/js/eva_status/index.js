window.Request = require('superagent');
window.moment = require('moment');
window.Table = ReactBootstrap.Table;
window.Button = ReactBootstrap.Button;
window.Header = require('../components/header');


Actions = Reflux.createActions({
    "load": {children: ["completed", "failed"]},
    "onTimeRangeChange": {},
    "setTimeRange": {}
})

Actions.load.listen(function () {
    Request.get(evaStatusContentUrl, function (res) {
        var evaStatusList = JSON.parse(res.text);
        $.each(evaStatusList, function (index, evaStatus) {
            $.each(evaStatus.lessons, function (index, lesson) {
                lesson[1] = lesson[1] * 1000;
            })
        });
        Actions.load.completed(evaStatusList);
    });
});

EVA_STATUS_TABLE = React.createClass({
    mixins: [Reflux.listenTo(Actions.load.completed, "onLoadCompleted"), Reflux.listenTo(Actions.setTimeRange, "onTimeRangeChange"), Reflux.listenTo(Actions.onTimeRangeChange, "onTimeRangeChange")],
    getInitialState: function () {
        var Level = function (id, label, min, max) {
            this.id = id;
            this.label = label;
            this.min = min;
            this.max = max;
        };
        Level.prototype.isLevel = function (evaStatus) {
            if (evaStatus.lessons.length >= this.min && evaStatus.lessons.length <= this.max) {
                return true;
            }
            return false;
        };
        var Depart = function (id, label, f) {
            this.id = id;
            this.label = label;
            this.isDepartFunction = f;
        };

        Depart.prototype.isDepart = function (evaStatus) {
            return this.isDepartFunction(evaStatus);
        }

        return {
            loaded: false,
            levels: [
                new Level(1, '連結中 (0 ~ 0課)', 0, 0),
                new Level(2, '入門 (1 ~ 5課)', 1, 5),
                new Level(3, '初級 (6 ~ 15課)', 6, 15),
                new Level(4, '中級 (16 ~ 25課)', 16, 25),
                new Level(5, '高級 (26 ~ 30課)', 26, 30)],
            departs: [new Depart(1, 'SS 男', function (evaStatus) {
                return evaStatus.depart == '國高中部' && evaStatus.gender;
            })
                , new Depart(2, 'SS 女', function (evaStatus) {
                    return evaStatus.depart == '國高中部' && !evaStatus.gender;
                })
                , new Depart(3, 'Campus 男', function (evaStatus) {
                    return evaStatus.depart == '大學部' && evaStatus.gender;
                })
                , new Depart(4, 'Campus 女', function (evaStatus) {
                    return evaStatus.depart == '大學部' && !evaStatus.gender;
                })
                , new Depart(5, '青年部 男', function (evaStatus) {
                    return evaStatus.depart == '青年部' && evaStatus.gender;
                })
                , new Depart(6, '青年部 女', function (evaStatus) {
                    return evaStatus.depart == '青年部' && !evaStatus.gender;
                })
                , new Depart(7, '長年部 男', function (evaStatus) {
                    return evaStatus.depart == '長年部';
                })

            ],
            evaStatusList: []
        };
    },
    onLoadCompleted: function (evaStatusList) {
        //this.evaStatusList = evaStatusList;
        evaStatusList.sort(function (a, b) {
            return a.order - b.order;
        });
        this.setState({evaStatusList: evaStatusList, loaded: true});
    },
    onTimeRangeChange: function (timeRange) {
        //console.log(timeRange);
        this.setState({timeRange: timeRange});
    },
    getLessonsBeforePeriod: function (evaStatus) {
        var result = 0;
        if (this.state.timeRange.start && this.state.timeRange.end && evaStatus.lessons) {
            $.each(evaStatus.lessons, function (index, lesson) {

                if (moment(lesson[1]).isBefore(this.state.timeRange.start)) {
                    result = result + 1;
                }
            }.bind(this));
        }
        return result;
    },
    getLessonsAfterPeriod: function (evaStatus) {
        var result = 0;
        if (this.state.timeRange.start && this.state.timeRange.end && evaStatus.lessons) {
            $.each(evaStatus.lessons, function (index, lesson) {
                if (moment(lesson[1]).isAfter(this.state.timeRange.end)) {
                    result = result + 1;
                }
            }.bind(this));
        }
        return result;
    },
    getLessonsBetweenPeriod: function (evaStatus) {
        var result = 0;

        if (this.state.timeRange.start && this.state.timeRange.end && evaStatus.lessons) {
            $.each(evaStatus.lessons, function (index, lesson) {
                //console.log(this.state.timeRange);
                //console.log(lesson);
                if (moment(lesson[1]).isSame(this.state.timeRange.end) || moment(lesson[1]).isSame(this.state.timeRange.start) || (moment(lesson[1]).isAfter(this.state.timeRange.start) && moment(lesson[1]).isBefore(this.state.timeRange.end))) {

                    result = result + 1;
                }
            }.bind(this));
        }
        return result;
    },
    getListeningEvaStatusBetweenPeriod: function (evaStatusList) {

        var result = 0;
        $.each(evaStatusList, function (index, evaStatus) {
            if (this.getLessonsBetweenPeriod(evaStatus) > 0) {
                result = result + 1;
            }
        }.bind(this));
        return result;
    },
    groupBy: function (array, f) {
        var groups = {};
        array.forEach(function (o) {
            var group = JSON.stringify(f(o));
            groups[group] = groups[group] || [];
            groups[group].push(o);
        });
        return groups;
    },
    render: function () {
        console.log(this.state.loaded);
        return (
            <div>
                <h3 style={{display: this.state.loaded ? 'none' : 'block', textAlign: 'center'}}>
                讀取中，請稍候...
                </h3>
                <div style={{display: this.state.loaded ? 'block' : 'none'}}>
                    <Table striped bordered condensed hover>
                        <thead>
                            <tr>
                                <th></th>
                {this.state.levels.map(function (level) {
                    return (
                        <th>{level.label}</th>
                        )
                })
                    }
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td></td>
                    {this.state.levels.map(function (level) {
                        var matchedEvaStatusList = $.grep(this.state.evaStatusList, function (evaStatus) {
                            return level.isLevel(evaStatus)
                        });
                        return (
                            <td>{matchedEvaStatusList.length}({this.getListeningEvaStatusBetweenPeriod(matchedEvaStatusList)})</td>
                            )
                    }.bind(this))
                        }
                                <td>{this.state.evaStatusList.length}({this.getListeningEvaStatusBetweenPeriod(this.state.evaStatusList)})

                                </td>
                            </tr>
                {
                    this.state.departs.map(function (depart) {
                        var matchedEvaStatusList = $.grep(this.state.evaStatusList, function (evaStatus) {
                            return depart.isDepart(evaStatus);
                        });
                        return (<tr>
                            <td>{depart.label}</td>
                            {this.state.levels.map(function (level) {
                                var matchedEvaStatusList = $.grep(this.state.evaStatusList, function (evaStatus) {
                                    return depart.isDepart(evaStatus) && level.isLevel(evaStatus);
                                });
                                return <td>
                                    <div>{matchedEvaStatusList.length}({this.getListeningEvaStatusBetweenPeriod(matchedEvaStatusList)})</div>{
                                    matchedEvaStatusList.map(function (evaStatus) {
                                        var style = {};
                                        if (evaStatus.gender) {
                                            style = {color: 'blue'};
                                        } else {
                                            style = {color: 'red'};
                                        }
                                        return <div >
                                            <a style={style}>{evaStatus.name}({this.getLessonsBeforePeriod(evaStatus)} + {this.getLessonsBetweenPeriod(evaStatus)} + {this.getLessonsAfterPeriod(evaStatus)})</a>
                                        </div>
                                    }.bind(this))
                                    }</td>
                            }.bind(this))}
                            <td>
                                {matchedEvaStatusList.length}({this.getListeningEvaStatusBetweenPeriod(matchedEvaStatusList)})
                            </td>
                        </tr>);
                    }.bind(this))
                    }
                        </tbody>
                    </Table>
                </div>
            </div>
            );
    }
})
;

var DateField = React.createClass({
    mixins: [Reflux.listenTo(Actions.setTimeRange, "onTimeRangeChange")],
    getInitialState: function () {
        return {startYear: '', startMonth: '', startDay: '', endYear: '', endMonth: '', endDay: ''};
    },
    submit: function () {
        var startYear = parseInt($(this.refs.startYear.getDOMNode()).val());
        var startMonth = parseInt($(this.refs.startMonth.getDOMNode()).val());
        var startDay = parseInt($(this.refs.startDay.getDOMNode()).val());
        var startDate = moment().year(startYear).month(startMonth - 1).date(startDay).format('YYYY/MM/DD');

        var endYear = parseInt($(this.refs.endYear.getDOMNode()).val());
        var endMonth = parseInt($(this.refs.endMonth.getDOMNode()).val());
        var endDay = parseInt($(this.refs.endDay.getDOMNode()).val());
        var endDate = moment().year(endYear).month(endMonth - 1).date(endDay).format('YYYY/MM/DD');
        console.log(startDate);
        console.log(endDate);
        Actions.onTimeRangeChange({start: startDate, end: endDate});

    },
    onTimeRangeChange: function (timeRange) {
        var startArr = timeRange.start.split('/');
        this.setState({startYear: "" + parseInt(startArr[0])});
        this.setState({startMonth: "" + parseInt(startArr[1])});
        this.setState({startDay: "" + parseInt(startArr[2])});
        var endArr = timeRange.end.split('/');
        this.setState({endYear: "" + parseInt(endArr[0])});
        this.setState({endMonth: "" + parseInt(endArr[1])});
        this.setState({endDay: "" + parseInt(endArr[2])});
    },
    onChange: function (event) {
        if (Object.is(event.target, this.refs.startYear.getDOMNode())) {
            this.setState({startYear: event.target.value});
        } else if (Object.is(event.target, this.refs.startMonth.getDOMNode())) {
            this.setState({startMonth: event.target.value});
        } else if (Object.is(event.target, this.refs.startDay.getDOMNode())) {
            this.setState({startDay: event.target.value});
        } else if (Object.is(event.target, this.refs.endYear.getDOMNode())) {
            this.setState({endYear: event.target.value});
        } else if (Object.is(event.target, this.refs.endMonth.getDOMNode())) {
            this.setState({endMonth: event.target.value});
        } else if (Object.is(event.target, this.refs.endDay.getDOMNode())) {
            this.setState({endDay: event.target.value});
        }
    },
    render: function () {
        var style = {display: 'inline-block', marginRight: '20px', marginBottom: '20px'};
        return <div>
            <span style={style} >
                <label>開始</label>
                <input type="number" min="2012" max="2020" ref="startYear" value={this.state.startYear} onChange={this.onChange} />
            年
                <input type="number" min="1" max="12"  ref="startMonth" value={this.state.startMonth}  onChange={this.onChange} />
            月
                <input type="number" min="1" max="31"  ref="startDay" value={this.state.startDay}  onChange={this.onChange} />
            日
            </span>
            <span  style={style}>
                <label>結束</label>
                <input type="number" min="2012" max="2020"  ref="endYear" value={this.state.endYear}  onChange={this.onChange} />
            年
                <input type="number" min="1" max="12"  ref="endMonth" value={this.state.endMonth}  onChange={this.onChange} />
            月
                <input type="number" min="1" max="31"  ref="endDay" value={this.state.endDay}  onChange={this.onChange} />
            日
            </span>
            <Button bsStyle='primary' onClick={this.submit}>送出</Button>
        </div>
    }
})

var LogoutBtn = React.createClass({
    onClick: function () {
        window.location.href = '/logout';
    },
    render: function () {
        return <Button bsStyle='danger' style={{float: 'right'}} onClick={this.onClick}>Logout</Button>
    }
})


React.render((
    <div style={{padding: '20px'}}>
        <LogoutBtn/>
        <DateField/>
        <EVA_STATUS_TABLE/>
    </div>
    ), document.getElementById('content'));

Actions.load();
Actions.setTimeRange({start: moment().add(-7, 'days').format('YYYY/MM/DD'), end: moment().format('YYYY/MM/DD')});
