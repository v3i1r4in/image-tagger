import { ThemeProvider } from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core/styles';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './app';

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#ffffff'
    }
  },
});

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
);