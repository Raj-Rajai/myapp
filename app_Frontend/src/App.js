// import MyApp from './myapp';
// function App() {
//     return (
//         <div>
//             <h1>Welcome to React</h1>
//             <MyApp />
//         </div>
//     );
// }
import { BrowserRouter, Routes, Route, } from 'react-router-dom';

import Content from './components/Content';
import Header from './components/Header';
import Registration from './components/Registration';
import ShowUsers from './components/Show Users';

import Home from './pages/Home';
import About from './pages/About';
import Gallery from './pages/Gallery';

import './App.css';


// import Footer from './Footer';
// import Counter from './Counter';


// let a = prompt("Enter your name");
// a = Number.parseInt(a);

const App = () => {
        return(
                <BrowserRouter>
                <div className="App-header">            
                <Header fname="pkebmpe " lname="etngo " />
                <main className="App-main">
                        <Routes>
                            <Route path="/Home" element={<Home />} />
                            <Route path="/About" element={<About />} />
                            <Route path="/Gallery" element={<Gallery />} />
                            <Route path="/Content" element={<Content />} />
                            <Route path="/Registration" element={<Registration />} />
                            <Route path="/ShowUsers" element={<ShowUsers />} />
                        </Routes>
                        {/* <Counter /> */}
                        </main>
                    {/* <Footer name="Diddy" /> */}
                </div>
                </BrowserRouter>
            );
        }

        export default App;