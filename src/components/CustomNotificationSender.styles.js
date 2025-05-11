// Styles for the CustomNotificationSender component
// Dynamic styling based on theme mode

const getStyles = (themeMode) => ({
  container: {
    mt: 4, 
    mb: 4
  },
  paper: {
    p: 3, 
    backgroundColor: themeMode === 'dark' ? '#2A2A2A' : '#FFFFFF',
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333',
    borderRadius: 2,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
  },
  header: {
    display: 'flex', 
    alignItems: 'center', 
    mb: 2
  },
  backButton: {
    mr: 2, 
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333'
  },
  title: {
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333', 
    fontWeight: 'bold'
  },
  divider: {
    mb: 3, 
    backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  },
  tabs: {
    mb: 3,
    '& .MuiTabs-indicator': {
      backgroundColor: '#4caf50',
      height: 3
    }
  },
  tab: {
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333', 
    '&.Mui-selected': { 
      color: '#4caf50' 
    }
  },
  templateBox: {
    mb: 3, 
    p: 2, 
    backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', 
    borderRadius: 1
  },
  sectionTitle: {
    mb: 2, 
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333'
  },
  subsectionTitle: {
    mb: 1, 
    fontWeight: 'bold',
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333'
  },
  select: {
    backgroundColor: themeMode === 'dark' ? '#3A3A3A' : '#F5F5F5',
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#4caf50'
    }
  },
  button: {
    backgroundColor: '#4caf50',
    '&:hover': { 
      backgroundColor: '#3d8b40' 
    }
  },
  textField: {
    mb: 2,
    '& .MuiOutlinedInput-root': {
      '& fieldset': { 
        borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' 
      },
      '&:hover fieldset': { 
        borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)' 
      },
      '&.Mui-focused fieldset': { 
        borderColor: '#4caf50' 
      }
    },
    '& .MuiInputBase-input': { 
      color: themeMode === 'dark' ? '#FFFFFF' : '#333333' 
    },
    '& .MuiInputLabel-root': {
      color: themeMode === 'dark' ? '#FFFFFF' : '#666666'
    }
  },
  radio: {
    color: themeMode === 'dark' ? '#FFFFFF' : '#666666', 
    '&.Mui-checked': { 
      color: '#4caf50' 
    }
  },
  advancedOptionsBox: {
    mt: 2, 
    p: 2, 
    backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', 
    borderRadius: 1
  },
  switch: {
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: '#4caf50',
      '&:hover': { 
        backgroundColor: 'rgba(76, 175, 80, 0.08)' 
      }
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: '#4caf50'
    }
  },
  sendButton: {
    mt: 3,
    backgroundColor: '#4caf50',
    '&:hover': { 
      backgroundColor: '#3d8b40' 
    },
    py: 1.5
  },
  card: {
    backgroundColor: themeMode === 'dark' ? '#3A3A3A' : '#F5F5F5', 
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333'
  },
  chipAdmin: {
    backgroundColor: '#ff9800',
    color: '#FFFFFF'
  },
  chipUser: {
    backgroundColor: '#2196f3',
    color: '#FFFFFF'
  },
  chipAllUsers: {
    backgroundColor: '#4caf50',
    color: '#FFFFFF'
  },
  historyButton: {
    borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
    color: themeMode === 'dark' ? '#FFFFFF' : '#333333',
    '&:hover': { 
      borderColor: themeMode === 'dark' ? '#FFFFFF' : '#000000' 
    }
  },
  metaText: {
    display: 'block', 
    mt: 2, 
    color: themeMode === 'dark' ? '#AAAAAA' : '#666666'
  }
});

export default getStyles;
