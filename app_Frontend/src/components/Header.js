import { Link } from 'react-router-dom';

function Header({ fname, lname }){
    return (
        <div className="myheader">
            <p>This is Header</p>
            <p>hello {fname} {lname}</p>
            <ul>
                <li><Link to="/Home">Home</Link></li>
                <li><Link to="/About">About</Link></li>
                <li><Link to="/Gallery">Gallery</Link></li>
                <li><Link to="/Content">Content</Link></li>
                <li><Link to="/Registration">Registration</Link></li>
            </ul>
        </div>
    );
}

export default Header;