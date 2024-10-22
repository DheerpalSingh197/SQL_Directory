import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './SearchBar.module.scss';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import KeyboardArrowLeftIcon from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import Modal from '../Modal/Modal';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [affectedRows, setAffectedRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const runQueryButtonRef = useRef(null);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const executeQuery = async (singleQuery) => {
    try {
      const response = await axios.post(import.meta.env.VITE_REACT_APP_QUERY_URL, { sqlQuery: singleQuery || query });

      if (response.data.error) {
        setErrorMessage(response.data.error.message);
        setTimeout(() => {
          setErrorMessage('');
        }, 3000);
        setQueryResults([]);
        setRowCount(0);
        setAffectedRows(0);
      } else {
        const results = Array.isArray(response.data.results) ? response.data.results : [];
        setQueryResults(results);
        setRowCount(response.data.rowCount || 0);
        setAffectedRows(response.data.affectedRows || 0);
        setCurrentPage(1);
        setErrorMessage('');
      }
      return response.data;
    } catch (error) {
      console.error('Error executing query:', error);
      if (error.response && error.response.status === 400) {
        setErrorMessage(error.response.data.error.message);
      } else {
        setErrorMessage('Error executing query. Please try again.');
      }
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
      setQueryResults([]);
      setRowCount(0);
      setAffectedRows(0);
      throw new Error(error.response ? error.response.data.error.message : 'Error executing SQL query.');
    }
  };

  const downloadCSV = () => {
    const csv = Papa.unparse(queryResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'query_results.csv');
  };

  useEffect(() => {
    setTotalPages(Math.ceil(queryResults.length / recordsPerPage));
  }, [queryResults, recordsPerPage]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setErrorMessage('Please enter an SQL query.');
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
      return;
    }

    const queries = query.split(';').filter(q => q.trim());
    let totalResults = [];
    let totalRowCount = 0;
    let totalAffectedRows = 0;

    try {
      for (const q of queries) {
        const result = await executeQuery(q);
        totalResults = totalResults.concat(Array.isArray(result.results) ? result.results : []);
        totalRowCount += result.rowCount || 0;
        totalAffectedRows += result.affectedRows || 0;
      }

      setQueryResults(totalResults);
      setRowCount(totalRowCount);
      setAffectedRows(totalAffectedRows);
      setErrorMessage('');
      setSuccessMessage(`Query executed successfully! ${totalResults.length} rows returned, ${totalAffectedRows} rows affected.`);
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setQueryResults([]);
      setRowCount(0);
      setAffectedRows(0);
      setErrorMessage(error.message);
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    }
  };

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = queryResults.slice(indexOfFirstRecord, indexOfLastRecord);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const maxVisiblePages = 5;

  const renderPageButtons = () => {
    const pageButtons = [];
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));

    for (let i = startPage; i <= Math.min(totalPages, startPage + maxVisiblePages - 1); i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => paginate(i)}
          className={`${styles['page-button']} ${i === currentPage ? styles['active'] : ''}`}
        >
          {i}
        </button>
      );
    }

    return pageButtons;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default form submission
      runQueryButtonRef.current.click(); // Trigger the button click
    }
  };

  return (
    <div>
      <Modal queryResults={queryResults} closeModal={closeModal} isModalOpen={isModalOpen}/>
      {errorMessage && (
        <div className={`${styles['popup-message']} ${styles['error']}`}>
          <p>{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className={`${styles['popup-message']} ${styles['success']}`}>
          <p>{successMessage}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className={styles['search-form']}>
        <textarea
          value={query}
          onChange={handleInputChange}
          placeholder="Enter SQL query"
          className={styles['search-input']}
          rows="5"
          onKeyDown={handleKeyDown} // Add onKeyDown event handler
        />
        <button
          type="submit"
          className={styles['search-button']}
          ref={runQueryButtonRef} // Set ref to the button
        >
          Run Query
        </button>
        {queryResults.length > 0 && (
          <>
            <button type="button" onClick={downloadCSV} className={styles['download-button']}>
              Download CSV
            </button>
            <button type="button" onClick={openModal} className={styles['email-button']}>
              Send CSV
            </button>
          </>
        )}
      </form>
      <div className={styles['records-per-page']}>
        Show{' '}
        <select value={recordsPerPage} onChange={handleRecordsPerPageChange}>
          {[5, 10, 15, 25].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>{' '}
        records per page
      </div>
      {affectedRows > 0 && (
  <div style={{ textAlign: 'center', marginTop: '20px' }}>
    {`Number of rows affected: ${affectedRows}`}
  </div>
)}

      <div className={styles['results-table-container']}>
        {queryResults.length > 0 ? (
          <table className={styles['results-table']}>
            <thead>
              <tr>
                <th>#</th>
                {Object.keys(queryResults[0])
                  .filter((key) => key !== 'id')
                  .map((key) =>
                    key === 'position' ? (
                      <React.Fragment key={key}>
                        <th>{key}</th>
                        <th>department_id</th>
                      </React.Fragment>
                    ) : key !== 'department_id' && <th key={key}>{key}</th>
                  )}
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((row, index) => (
                <tr key={index}>
                  <td>{indexOfFirstRecord + index + 1}</td>
                  {Object.keys(row)
                    .filter((key) => key !== 'id')
                    .map((key, i) =>
                      key === 'position' ? (
                        <React.Fragment key={i}>
                          <td>{row[key]}</td>
                          <td>{row['department_id']}</td>
                        </React.Fragment>
                      ) : key !== 'department_id' && <td key={i}>{row[key]}</td>
                    )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          ""
        )}
      </div>
      {queryResults.length > 0 && (
        <div className={styles['pagination']}>
          {totalPages > 0 && (
            <div className={styles['pagination-info']}>
              {`Showing ${indexOfFirstRecord + 1} to ${Math.min(
                indexOfLastRecord,
                queryResults.length
              )} of ${queryResults.length} entries. Rows affected: ${affectedRows}.`}
            </div>
          )}
          <div className={styles['page-buttons']} style={{ marginRight: '20px' }}>
            {currentPage > 1 && (
              <button className={styles['nav-button']} onClick={() => paginate(currentPage - 1)}>
                <KeyboardArrowLeftIcon />
              </button>
            )}
            {renderPageButtons()}
            <button
              className={styles['nav-button']}
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <KeyboardArrowRightIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
