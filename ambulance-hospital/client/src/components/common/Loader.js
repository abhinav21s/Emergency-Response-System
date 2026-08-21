import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

const Loader = ({ size = 'md', variant = 'primary', text = 'Loading...' }) => {
  return (
    <Container className="d-flex flex-column justify-content-center align-items-center py-5">
      <div className="position-relative">
        <Spinner 
          animation="border" 
          variant={variant} 
          className={`spinner-${size} mb-3`}
          style={{
            width: size === 'lg' ? '5rem' : size === 'md' ? '3rem' : '1.5rem',
            height: size === 'lg' ? '5rem' : size === 'md' ? '3rem' : '1.5rem',
            opacity: 0.75
          }}
        />
        <Spinner 
          animation="grow" 
          variant="accent" 
          className={`spinner-${size} position-absolute top-50 start-50 translate-middle`}
          style={{
            width: size === 'lg' ? '3rem' : size === 'md' ? '2rem' : '1rem',
            height: size === 'lg' ? '3rem' : size === 'md' ? '2rem' : '1rem',
            opacity: 0.5,
            backgroundColor: 'var(--accent-color)'
          }}
        />
      </div>
      {text && <p className="text-center text-muted mt-2">{text}</p>}
    </Container>
  );
};

export default Loader;
