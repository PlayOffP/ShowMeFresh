# Coding Conventions

## File Organization

### Directory Structure
```
app/
├── (tabs)/          # Tab-based navigation screens
├── (auth)/          # Authentication-related screens
├── hooks/           # App-specific hooks
├── utils/           # App-specific utilities
components/          # Reusable UI components
context/             # React Context providers
data/                # Static data and mock content
hooks/               # Shared hooks
services/            # API and external service integrations
utils/               # Shared utilities
guidelines/          # Project documentation
```

### File Naming
- **Components**: PascalCase (e.g., `VideoCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useGenrePrefs.ts`)
- **Screens**: camelCase (e.g., `must-watch.tsx`)
- **Utilities**: camelCase (e.g., `showCache.ts`)
- **Types**: PascalCase (e.g., `AppContext.tsx`)

## Code Style

### TypeScript
- Use TypeScript for all new code
- Define interfaces for all data structures
- Use strict type checking
- Prefer `interface` over `type` for object shapes

### React Components
- Use functional components with hooks
- Export components as named exports
- Use React.memo for performance optimization when needed
- Keep components focused and single-purpose

### State Management
- Use React Context for global state
- Use local state for component-specific data
- Prefer `useCallback` and `useMemo` for performance
- Use AsyncStorage for persistent data

### Styling
- Use StyleSheet.create for all styles
- Follow consistent color scheme:
  - Primary: `#FF0050`
  - Background: `#000`
  - Surface: `#111`, `#222`
  - Text: `#fff`, `#CCC`, `#AAA`
- Use Inter font family consistently
- Maintain consistent spacing and padding

## Naming Conventions

### Variables and Functions
- Use descriptive, camelCase names
- Boolean variables should start with `is`, `has`, `can`, etc.
- Functions should be verbs or verb phrases
- Constants should be UPPER_SNAKE_CASE

### Examples
```typescript
// Good
const isShowSaved = (showId: string) => boolean;
const handleSavePress = () => void;
const userProfile: UserProfile;
const SAVE_BUTTON_TEXT = 'Save Show';

// Avoid
const saved = (id: string) => boolean;
const save = () => void;
const profile: Profile;
const text = 'Save Show';
```

## Component Structure

### Standard Component Template
```typescript
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

interface ComponentProps {
  // Define props
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Hooks first
  // State management
  // Event handlers
  // Render logic
  
  return (
    <View style={styles.container}>
      {/* JSX */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Styles
  },
});
```

## Data Flow

### Context Usage
- Use AppContext for global state
- Keep context providers at the top level
- Use custom hooks to access context data
- Avoid prop drilling

### Async Operations
- Use try-catch for error handling
- Provide fallback UI for loading states
- Use React Query for server state management
- Handle AsyncStorage errors gracefully

## Performance Guidelines

### Optimization Techniques
- Use `useMemo` for expensive calculations
- Use `useCallback` for function props
- Use `React.memo` for pure components
- Avoid inline styles and functions in render

### Memory Management
- Clean up event listeners in useEffect
- Clear timeouts and intervals
- Avoid memory leaks in async operations

## Error Handling

### Error Boundaries
- Implement error boundaries for critical sections
- Provide user-friendly error messages
- Log errors for debugging

### Async Error Handling
```typescript
try {
  const data = await asyncOperation();
  // Handle success
} catch (error) {
  console.warn('Operation failed:', error);
  // Handle error gracefully
}
```

## Testing Guidelines

### Component Testing
- Test user interactions
- Verify state changes
- Test error scenarios
- Mock external dependencies

### Hook Testing
- Test hook behavior in isolation
- Verify state updates
- Test cleanup functions

## Documentation

### Code Comments
- Comment complex business logic
- Explain non-obvious implementations
- Document API integrations
- Keep comments up-to-date

### Component Documentation
- Document component props
- Explain component purpose
- Provide usage examples
- Document side effects

## Accessibility

### Accessibility Features
- Use semantic HTML elements
- Provide alt text for images
- Support screen readers
- Ensure keyboard navigation
- Maintain color contrast ratios

## Security

### Data Security
- Validate user inputs
- Sanitize data before storage
- Use secure storage for sensitive data
- Implement proper authentication

## Performance Monitoring

### Metrics to Track
- Component render times
- Memory usage
- Network request performance
- User interaction responsiveness

## Code Review Checklist

### Before Submitting
- [ ] Code follows naming conventions
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Performance considerations addressed
- [ ] Accessibility features included
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No console.log statements in production code 