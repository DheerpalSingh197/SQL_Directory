import React, { useState } from 'react';
import styles from './Modal.module.scss';
import axios from 'axios';
import Papa from 'papaparse';

const Modal = ({ closeModal, isModalOpen, queryResults }) => {
  const initialFormValues = {
    subject: '',
    to: '',
    cc: '',
    bcc: ''
  };

  const [formValues, setFormValues] = useState(initialFormValues);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const sendEmailWithCSV = async (e) => {
    e.preventDefault();
    try {
      const csv = Papa.unparse(queryResults);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], 'query_results.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(import.meta.env.VITE_REACT_APP_UPLOAD_CSV, formData);

      if (response.data.message) {
        const authURL = import.meta.env.VITE_REACT_APP_AUTH_URL;
        const emailApiUrl = import.meta.env.VITE_REACT_APP_EMAIL_API_URL;
        const authData = {
          apikey: import.meta.env.VITE_REACT_APP_API_KEY,
          username: import.meta.env.VITE_REACT_APP_USERNAME,
          password: import.meta.env.VITE_REACT_APP_PASSWORD,
          partner_name: import.meta.env.VITE_REACT_APP_PARTNER_NAME,
        };

        const emailData = {
          mailSubject: formValues.subject,
          mailMessage: `<a href="${import.meta.env.VITE_REACT_MAIL_MESSAGE}${response.data.file.path}" download>Download CSV</a>`,
          toEmail: formValues.to.split(',').map(email => email.trim()),
          ccAddress: formValues.cc.split(',').map(email => email.trim()),
          bccAddress: formValues.bcc.split(',').map(email => email.trim()),
          toName: 'LoanBox',
          fromEmail: 'loanbox@gaadi.com',
          fromName: 'LoanBox',
        };

        const authResponse = await axios.post(authURL, {}, { headers: authData });
        const token = authResponse.data.result.token;

        const emailResponse = await axios.post(emailApiUrl, emailData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        alert('Email Sent Successfully!');
        setFormValues(initialFormValues);
        closeModal();
      } else {
        alert('Error uploading file. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  };

  return (
    <div className={`${styles.modal} ${isModalOpen ? styles.open : ''}`}>
      <div className={styles['modal-content']}>
        <span className={styles.close} onClick={closeModal}>&times;</span>
        <form onSubmit={sendEmailWithCSV}>
          <label>
            Subject:
            <input
              type="text"
              name="subject"
              value={formValues.subject}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            To:
            <input
              type="text"
              name="to"
              value={formValues.to}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            CC:
            <input
              type="text"
              name="cc"
              value={formValues.cc}
              onChange={handleChange}
            />
          </label>
          <label>
            BCC:
            <input
              type="text"
              name="bcc"
              value={formValues.bcc}
              onChange={handleChange}
            />
          </label>
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
};

export default Modal;
