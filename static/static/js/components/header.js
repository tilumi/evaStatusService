(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/lucasmf/Documents/workspace-sts-3.6.3.SR1/forever-official/libexec/evaStatusService/static/client-app/js/components/header.js":[function(require,module,exports){
Navbar = ReactBootstrap.Navbar;
Nav = ReactBootstrap.Nav;
NavItem = ReactBootstrap.NavItem;
Button = ReactBootstrap.Button;
Header = React.createClass({displayName: "Header",
    render: function () {
        return (
            React.createElement(Navbar, null, 
                React.createElement(Nav, null, 
                    React.createElement(Button, {bsStyle: "danger navbar-btn"}, "Logout")
                )
            )
        );
    }
});
module.exports = Header;


},{}]},{},["/Users/lucasmf/Documents/workspace-sts-3.6.3.SR1/forever-official/libexec/evaStatusService/static/client-app/js/components/header.js"])

