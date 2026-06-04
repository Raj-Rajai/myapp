import  {useEffect, useState} from 'react';
import axios from 'axios';

const ShowUsers = () => {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get("https://myapp-3y37.onrender.com/get_users");
                setUsers(response.data);
            }
            catch (error) {
                console.error("Error fetching users:", error);
            }
        };  
        fetchUsers();
    }, []);
    return (
        <div className="showusers">
            <h1>List of Registered Users</h1>
            <ul>
                {users.map((user) => (
                    <li key={user.id}>
                        <strong>Username:</strong> {user.username} <br />
                        <strong>Email:</strong> {user.email}
                    </li>
                ))} 
            </ul>
        </div>
    );
}
export default ShowUsers;