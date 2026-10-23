# Seagull Academy Admin Dashboard

A responsive and secure admin dashboard for managing enquiries and applications with a cyberpunk/neon aesthetic.

## 🎨 Features

### Design & Theme
- **Cyberpunk/Neon Aesthetic**: Matte black backgrounds with neon blue (#00BFFF) and cyan (#00FFFF) accents
- **Glassmorphism**: Subtle backdrop blur effects and transparent panels
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Smooth Animations**: Fade-in effects, hover glows, and neon light sweeps

### Authentication & Security
- **Protected Routes**: Only authenticated users can access admin features
- **Appwrite Integration**: Secure authentication using Appwrite backend
- **Session Management**: Automatic session validation and logout functionality

### Navigation
- **Left Sidebar**: Vertical navigation with neon hover effects
- **Top Bar**: Search functionality, notifications, and user profile
- **Active States**: Glowing neon blue outlines for current page

### Data Management

#### Enquiries Page
- **Table View**: Paginated display (10 items per page)
- **Filters**: By subject, status, and outcome
- **Quick Actions**: View details, edit, mark as addressed
- **Status Management**: Pending → Addressed workflow
- **Outcome Tracking**: Converted, Lost, Follow-up, Custom

#### Applications Page
- **Table View**: Similar structure to enquiries
- **Course Filtering**: Filter by specific courses
- **Interest Levels**: Interested, Not Interested, Custom
- **Status & Outcome**: Same workflow as enquiries

### Shared Features
- **Modals**: Full-screen detail views and edit forms
- **Pagination**: Navigation controls with neon styling
- **Search**: Debounced search functionality
- **Toast Notifications**: Success, error, and info messages
- **Real-time Updates**: Instant status and outcome updates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Appwrite backend setup
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SeagullScienceAcademy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_APPWRITE_PROJECT_ID=your_project_id
   VITE_APPWRITE_ENDPOINT=your_endpoint
   VITE_APPWRITE_DATABASE_ID=your_database_id
   VITE_APPWRITE_DATABASE_ENQUIRY_ID=your_enquiry_collection_id
   VITE_APPWRITE_DATABASE_APPLICATION_ID=your_application_collection_id
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the dashboard**
   - Navigate to `/login` for authentication
   - After login, access `/admin` for the main dashboard

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── AdminLayout.jsx          # Main admin layout wrapper
│   ├── AdminSidebar.jsx         # Left navigation sidebar
│   ├── AdminTopBar.jsx          # Top search and profile bar
│   └── ProtectedRoute.jsx       # Authentication guard
├── contexts/
│   └── AuthContext.jsx          # Authentication state management
├── pages/
│   ├── Login.jsx                # Authentication page
│   ├── AdminDashboard.jsx       # Main dashboard overview
│   ├── AdminEnquiries.jsx       # Enquiries management
│   ├── AdminApplications.jsx    # Applications management
│   └── AdminSettings.jsx        # Settings and preferences
└── data/
    ├── config.js                # Appwrite configuration
    └── controllers.js           # API functions
```

### State Management
- **React Context**: Authentication state across components
- **Local State**: Component-specific data and UI state
- **Appwrite Integration**: Real-time database operations

## 🎯 Usage Guide

### Authentication
1. Navigate to `/login`
2. Enter admin credentials
3. Access protected routes automatically

### Managing Enquiries
1. **View All**: Navigate to `/admin/enquiries`
2. **Filter**: Use dropdown filters for subject, status, outcome
3. **Quick Actions**: 
   - 👁️ View full details
   - ✏️ Edit status/outcome
   - ✅ Mark as addressed
4. **Pagination**: Navigate through large datasets

### Managing Applications
1. **View All**: Navigate to `/admin/applications`
2. **Filter**: By course, status, interest, outcome
3. **Quick Actions**: Same as enquiries
4. **Interest Tracking**: Monitor student engagement levels

### Dashboard Overview
- **Statistics**: Total counts and trends
- **Quick Actions**: Direct navigation to key functions
- **Recent Activity**: Latest updates and changes

## 🔧 Configuration

### Tailwind CSS Customization
The dashboard uses custom Tailwind classes for the cyberpunk theme:

```css
/* Neon Colors */
.neon-blue: #00BFFF
.neon-cyan: #00FFFF
.neon-green: #39FF14
.neon-red: #FF3131
.neon-yellow: #FFD300

/* Backgrounds */
.matte-black: #0A0A0A
.light-text: #EAEAEA
```

### Appwrite Collections
Ensure your Appwrite database has these collections:

#### Enquiries Collection
- `name` (string)
- `phone` (string)
- `email` (string)
- `subject` (string)
- `message` (string)
- `status` (string: "Pending" | "Addressed")
- `addressedBy` (string)
- `outcome` (string)
- `date` (datetime)

#### Applications Collection
- `name` (string)
- `phone` (string)
- `email` (string)
- `course` (string)
- `message` (string)
- `status` (string: "Pending" | "Addressed")
- `interest` (string: "Interested" | "Not Interested" | "Custom")
- `outcome` (string)
- `date` (datetime)

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables
Ensure all environment variables are set in your production environment:
- Appwrite project configuration
- Database and collection IDs
- API endpoints

### Hosting
The dashboard can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

## 🔒 Security Considerations

- **Authentication Required**: All admin routes are protected
- **Session Validation**: Automatic session checks
- **Secure Logout**: Proper session cleanup
- **Input Validation**: Form data validation and sanitization
- **HTTPS**: Ensure secure connections in production

## 🎨 Customization

### Theme Colors
Modify `tailwind.config.js` to change the color scheme:
```javascript
colors: {
  'neon-blue': '#00BFFF',
  'neon-cyan': '#00FFFF',
  // ... other colors
}
```

### Animations
Customize animations in the Tailwind config:
```javascript
keyframes: {
  'glow-pulse': { /* ... */ },
  'neon-sweep': { /* ... */ }
}
```

### Layout
Adjust sidebar width, spacing, and responsive breakpoints in component files.

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Fails**
   - Check Appwrite configuration
   - Verify environment variables
   - Check browser console for errors

2. **Data Not Loading**
   - Verify collection IDs
   - Check database permissions
   - Review network requests

3. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check for CSS conflicts
   - Verify custom classes are defined

### Debug Mode
Enable debug logging by adding console.log statements in data fetching functions.

## 📱 Responsive Design

The dashboard is fully responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔄 Future Enhancements

- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: Charts and reporting features
- **Bulk Operations**: Mass status updates
- **Export Functionality**: CSV/PDF export
- **Email Integration**: Automated follow-up emails
- **Mobile App**: React Native companion app

## 📄 License

This project is part of the Seagull Academy system. Please refer to the main project license.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For technical support or questions about the admin dashboard:
- Check the troubleshooting section
- Review the Appwrite documentation
- Contact the development team

---

**Built with ❤️ for Seagull Academy**
