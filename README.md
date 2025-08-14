# Networking GPT

A modern networking management application built with React, TypeScript, and Supabase.

## Features

### Core Functionality
- **Contact Management**: Add, edit, and organize your professional network
- **Network Visualization**: Visual representation of your connections
- **AI Assistant**: Intelligent networking insights and suggestions
- **Invite System**: Share your network with others via invite links

### Premium Network Visualization (New!)

The application now includes a premium visual network map with advanced features:

#### Enhanced Avatar System
- **Professional Avatars**: High-quality avatar component with fallback initials
- **Gradient Backgrounds**: Deterministic gradient backgrounds based on user ID
- **Multiple Sizes**: xs, sm, md, lg, xl, 2xl sizes with responsive design
- **Status Indicators**: Optional online/offline status dots
- **Upload Support**: URL-based avatar uploads with preview

#### Modern Graph Visualization
- **2D/3D Toggle**: Switch between 2D and 3D visualization modes
- **Interactive Nodes**: Click to focus, hover for details
- **Category Color Coding**: 
  - Work: Blue
  - Family: Rose  
  - Friend: Green
  - Other: Slate
- **Focus Mode**: Highlight selected person and their connections
- **Smooth Animations**: Fluid transitions and hover effects

#### Professional UI Components
- **Glassmorphism Design**: Modern backdrop blur effects
- **Consistent Spacing**: 8/12/16 spacing system
- **Dark Mode Support**: Full dark mode compatibility
- **Responsive Layout**: Mobile-first design approach

#### Enhanced Filtering System
- **Category Filters**: Quick filter by work/family/friend/other
- **Closeness Range**: Slider for relationship strength (1-5)
- **Search Functionality**: Search by name, role, city, or handle
- **Active Filter Display**: Visual indicators for applied filters

#### Advanced Add Person Modal
- **Avatar Picker**: URL input with preview
- **Category Selection**: Visual category buttons
- **Closeness Slider**: Interactive relationship strength selector
- **Form Validation**: Real-time validation with error handling
- **Preview Card**: Live preview of the person being added

## Usage

### Hotkeys
- **N**: Quick add person
- **F**: Toggle focus mode (when person selected)
- **T**: Toggle 2D/3D mode
- **Ctrl/Cmd + K**: Search

### Navigation
1. **Navigate to Premium Ağ Haritası** tab
2. **Use 2D/3D toggle** to switch visualization modes
3. **Click on nodes** to focus on specific people
4. **Use filters** to narrow down your network view
5. **Add new people** with the enhanced modal

### Mock vs API Mode
The application automatically detects your environment:
- **Browser with Supabase**: Uses real API
- **Development/Testing**: Falls back to mock data

## Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: Zustand
- **Graph Visualization**: React Force Graph (2D/3D)
- **Backend**: Supabase (PostgreSQL + Auth + Functions)
- **UI Components**: Custom components with shadcn/ui

## File Structure

```
src/
├── components/
│   ├── network/
│   │   ├── VisualNetworkMap.tsx    # Premium network visualization
│   │   ├── AddPersonModal.tsx      # Enhanced person addition
│   │   ├── FiltersBar.tsx          # Advanced filtering
│   │   ├── Avatar.tsx              # Professional avatar component
│   │   └── ...
│   └── ui/
│       ├── avatar.tsx              # Enhanced avatar with variants
│       └── ...
├── utils/
│   └── colorTokens.ts              # Category color system
├── store/
│   └── network.ts                  # Zustand store with actions
└── services/
    └── NetworkRepository.ts        # Data layer abstraction
```

## Development

### Running the Application
```bash
npm install
npm run dev
```

### Production Deployment
```bash
# Automated deployment
./deploy.sh

# Manual deployment
npm run build
# Copy dist/ contents to your web server
```

### Davet Linkleri
Davet linkleri artık `/invite-link/{token}` formatında çalışır. Eski `/invite/{token}` formatı da geriye uyumluluk için desteklenir.

### Key Features Implementation
- **Avatar System**: Uses Radix UI Avatar with custom fallback logic
- **Color Tokens**: Centralized color system for consistent theming
- **Store Pattern**: Zustand store with computed properties
- **Repository Pattern**: Swappable data layer for testing

### Performance Optimizations
- **Lazy Loading**: Images load asynchronously
- **Debounced Search**: Prevents excessive API calls
- **Memoized Components**: React.memo for expensive operations
- **Virtual Scrolling**: For large network lists (planned)

## Future Enhancements

- **Real-time Collaboration**: Live network updates
- **Advanced Analytics**: Network insights and metrics
- **Export Features**: PDF/CSV network exports
- **Mobile App**: React Native companion app
- **AI Integration**: Smart networking suggestions
