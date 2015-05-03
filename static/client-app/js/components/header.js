Navbar = ReactBootstrap.Navbar;
Nav = ReactBootstrap.Nav;
NavItem = ReactBootstrap.NavItem;
Button = ReactBootstrap.Button;
Header = React.createClass({
    render: function () {
        return (
            <Navbar>
                <Nav>
                    <Button bsStyle='danger navbar-btn'>Logout</Button>
                </Nav>
            </Navbar>
        );
    }
});
module.exports = Header;