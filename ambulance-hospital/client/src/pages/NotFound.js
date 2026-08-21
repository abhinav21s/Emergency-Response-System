import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

const NotFound = () => {
  return (
    <Container className="py-5 text-center">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <h1 className="display-1 fw-bold text-danger">404</h1>
          <h2 className="mb-4">Page Not Found</h2>
          <p className="lead mb-5">
            The page you are looking for might have been removed, had its name changed,
            or is temporarily unavailable.
          </p>
          <Button as={Link} to="/" variant="primary" size="lg">
            <FaHome className="me-2" />
            Back to Home
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound;
