import React from 'react';
import SearchBar from './Components/SearchBar/SearchBar';


const App = () => {
  return (
    <div>
      <h1 style={{ marginLeft: '20px', fontSize: '24px', color: '#333' }}>Employee Directory</h1>
      <SearchBar />
    </div>
  );
};

export default App;
