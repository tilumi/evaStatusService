window.jQuery = window.$ = require('jquery');
window.React = require('react');
window.Reflux = require('reflux');
window.ReactBootstrap = require('react-bootstrap');
window.Request = require('superagent');
window.moment = require('moment');
window.Table = ReactBootstrap.Table;
window.Button = ReactBootstrap.Button;
window.Header = require('../components/header');
window.Multiselect = require('react-widgets').Multiselect;
window.DateTimePicker = require('react-widgets').DateTimePicker;
window.Combobox = require('react-widgets').Combobox;


Array.prototype.uniqueObjects = function(){
    function compare(a, b){
        for(var prop in a){
            if(a[prop] != b[prop]){
                return false;
            }
        }
        return true;
    }
    return this.filter(function(item, index, list){
        for(var i=0; i<index;i++){
            if(compare(item,list[i])){
                return false;
            }
        }
        return true;
    });
}

Actions = Reflux.createActions({
    "load": {children: ["completed", "failed"]},
    "loadHerders":{children: ["completed", "failed"]},
    "onTimeRangeChange": {},
    "setTimeRange": {},
    "onDimensionChange":{}
})

Actions.load.listen(function (herder) {
    Request.get(evaStatusContentUrl + "?username=" + herder, function (res) {
        var evaStatusList = JSON.parse(res.text);
        $.each(evaStatusList, function (index, evaStatus) {
            $.each(evaStatus.lessons, function (index, lesson) {
                lesson[1] = lesson[1] * 1000;
            })
            if(evaStatus.gender == false){
                evaStatus.gender = '女';
            }else{
                evaStatus.gender = '男';
            }
        });
        Actions.load.completed(evaStatusList);
    });
});

Actions.loadHerders.listen(function(){
    Request.get(herdersUrl, function(res){
        var herders = JSON.parse(res.text);
        Actions.loadHerders.completed(herders);
    });
})

HerdersDropdown = React.createClass({
    mixins: [Reflux.listenTo(Actions.loadHerders.completed, "onLoadCompleted")],
    getInitialState: function(){
        return {herders:[]};
    },
    onLoadCompleted:function(herders){
        this.setState({herders:herders})
    },
    onChange:function(herder){
        // console.log(herder);
        Actions.load(herder);
    },
    render:function(){
        return (
            <Combobox data={this.state.herders} onChange={this.onChange}/>
            )
    }
})

EVA_STATUS_TABLE = React.createClass({
    mixins: [Reflux.listenTo(Actions.load.completed, "onLoadCompleted"),
        Reflux.listenTo(Actions.setTimeRange, "onTimeRangeChange"),
        Reflux.listenTo(Actions.onTimeRangeChange, "onTimeRangeChange"),
        Reflux.listenTo(Actions.onDimensionChange, "onDimensionChange")],
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
            dimensionInstances: [],
            evaStatusList: []
        };
    },
    getUnique: function(inputArray)
    {
        return inputArray.uniqueObjects();
    },
    onLoadCompleted: function (evaStatusList) {
        //this.evaStatusList = evaStatusList;
        evaStatusList.sort(function (a, b) {
            return a.order - b.order;
        });
        this.setState({evaStatusList: evaStatusList, loaded: true});
        Actions.onDimensionChange([]);
    },
    onTimeRangeChange: function (timeRange) {
        // console.log(timeRange);
        this.setState({timeRange: timeRange});
    },
    cartesianProductOf: function(array) {
        if(array.length == 0){
            return [];
        }
        function addTo(curr, args) {

            var i, copy, 
            rest = args.slice(1),
                last = !rest.length,
                result = [];

            for (i = 0; i < args[0].length; i++) {

                copy = curr.slice();
                copy.push(args[0][i]);

                if (last) {
                    result.push(copy);
                } else {
                    result = result.concat(addTo(copy, rest));
                }
            }

            return result;
        }
        return addTo([], Array.prototype.slice.call(array));
    },
    onDimensionChange: function (dimensions){
        dimensionValues = []
        $.each(dimensions, function(index, dimension){
            values = []
            $.each(this.state.evaStatusList, function(index, evaStatus){
                values.push({property: dimension.valuesProperty, value: evaStatus[dimension.valuesProperty]})
            })
            var distinctValues = this.getUnique(values);
            // console.log(distinctValues);
            dimensionValues.push(distinctValues);
        }.bind(this));
        var productOfDimensionValues = this.cartesianProductOf(dimensionValues);
        // console.log(productOfDimensionValues);
        var DimensionInstance = function (dimensionValues) {
            this.dimensionValues = dimensionValues;            
        };
        DimensionInstance.prototype.isMatch = function (evaStatus) {
            var isMatch = true;
            $.each(this.dimensionValues, function(index, dimensionValue) {
                if(evaStatus[dimensionValue.property] != dimensionValue.value){
                    isMatch = false;
                }
            });            
            return isMatch;
        };        
        DimensionInstance.prototype.getLabel = function (evaStatus) {
            var result = '';
            $.each(this.dimensionValues, function(index, dimensionValue) {
                if(result.length > 0){
                    result = result + ' ';
                }
                result = result+ dimensionValue.value;
            });            
            return result;
        };        
        var dimensionInstances = [];
        $.each(productOfDimensionValues, function(index, dimensionValues) {
            dimensionInstances.push(new DimensionInstance(dimensionValues));
        });
        this.setState({dimensionInstances: dimensionInstances});
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
    render: function () {
        // console.log(this.state.loaded);
        // console.log(this.state.dimensionInstances);
        return (
            <div>                
                <div style={{display:'block'}}>
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
                    this.state.dimensionInstances.map(function (dimensionInstance) {
                        // console.log(dimensionInstance);
                        var matchedEvaStatusList = $.grep(this.state.evaStatusList, function (evaStatus) {
                            return dimensionInstance.isMatch(evaStatus);
                        });
                        return (<tr>
                            <td>{dimensionInstance.getLabel()}</td>
                            {this.state.levels.map(function (level) {
                                var matchedEvaStatusList = $.grep(this.state.evaStatusList, function (evaStatus) {
                                    return dimensionInstance.isMatch(evaStatus) && level.isLevel(evaStatus);
                                });
                                return <td>
                                    <div>{matchedEvaStatusList.length}({this.getListeningEvaStatusBetweenPeriod(matchedEvaStatusList)})</div>{
                                    matchedEvaStatusList.map(function (evaStatus) {
                                        var style = {};
                                        if (evaStatus.gender == '男') {
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
        return {startDate: null, endDate: null};
    },
    submit: function (startDate,endDate) {        
        var startDateStr = moment(startDate).format('YYYY/MM/DD');
        var endDateStr = moment(endDate).format('YYYY/MM/DD');    
        // console.log({start: startDateStr, end: endDateStr});
        Actions.onTimeRangeChange({start: startDateStr, end: endDateStr});
    },
    onTimeRangeChange: function (timeRange) {
        var startDate =moment(timeRange.start, "YYYY/MM/DD").toDate();
        var endDate =moment(timeRange.end, "YYYY/MM/DD").toDate();         
        this.setState({startDate: startDate, endDate: endDate});     
        this.submit(startDate,endDate);
    },
    onStartDateChange: function (date) {
        this.setState({startDate:date});
        this.submit(date, this.state.endDate);
    },
    onEndDateChange: function (date) {
        this.setState({endDate:date});
        this.submit(this.state.startDate, date);
    },
    render: function () {        
        return <div>
            <DateTimePicker value={this.state.startDate} onChange={this.onStartDateChange} style={{width:400}} time={false} format={"yyyy/MM/dd"}/>
            <DateTimePicker value={this.state.endDate} onChange={this.onEndDateChange} style={{width:400}} time={false} format={"yyyy/MM/dd"}/>                        
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

var DimensionMultiSelect = React.createClass({
    mixins: [Reflux.listenTo(Actions.onDimensionChange, "onDimensionChange")],
    onDimensionChange: function(dimensions){        
        this.setState({selectedDimensions:dimensions});
    },
    getInitialState:function(){
        var Dimension = function (name, valuesProperty) {
            this.name = name;
            this.valuesProperty = valuesProperty;            
        };
        return {dimensions:[new Dimension('教會','church'), new Dimension('性別','gender'), new Dimension('部門','depart')]
                ,selectedDimensions:[]
                };
    },
    onChange: function(dimensions){        
        this.state.selectedDimensions = dimensions
        Actions.onDimensionChange(dimensions);
    },
    render: function () {
        return <Multiselect value={this.state.selectedDimensions} data={this.state.dimensions} onChange={this.onChange} textField='name'/>
    }
})

var ConfForm = React.createClass({
    render: function(){
        return <form style={{width:400}}>
                    <div class="form-group">
                        <label>帳號</label>
                        <HerdersDropdown />
                    </div>
                    <div class="form-group">
                        <label>時間範圍</label>
                        <DateField/>
                    </div>
                    <div class="form-group">
                        <label>維度</label>
                        <DimensionMultiSelect />
                    </div>
                </form>
    }
})


React.render((
    <div>
        <div>
            <LogoutBtn/>
        </div>
        <div >  
            <ConfForm/>                        
        </div>
        <EVA_STATUS_TABLE/>        
    </div>
    ), document.getElementById('content'));

Actions.loadHerders();
Actions.setTimeRange({start: moment().add(-7, 'days').format('YYYY/MM/DD'), end: moment().format('YYYY/MM/DD')});
