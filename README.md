# Distill

> An app to read articles meaningfully

**Distill** is a modern web application designed to help you consume content more intentionally. Extract, process, and read articles in a distraction-free environment with features like PDF export and seamless content integration.

## Features

- 📖 **Clean Reading Experience** - Distraction-free article viewing interface
- 🎥 **Multi-Source Support** - Integrate content from various sources including YouTube
- 📄 **PDF Export** - Generate and download articles as PDFs
- 🚀 **Fast & Responsive** - Built with React and Vite for optimal performance
- 🎨 **Modern UI** - Contemporary design built with React 19

## Tech Stack

- **Frontend**: React 19, Vite
- **Backend**: Express.js
- **Content Processing**: jsPDF, youtubei.js
- **Utilities**: node-fetch, CORS, dotenv

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pujarini/distill.git
   cd distill
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (Vite default).

### Build for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint on the codebase |
| `npm run preview` | Preview production build locally |

## Project Structure

```
distill/
├── src/              # Source code
├── public/           # Static assets
├── vite.config.js    # Vite configuration
├── eslint.config.js  # ESLint configuration
└── package.json      # Dependencies and scripts
```

## Code Quality

This project uses **ESLint** to maintain consistent code quality. Run linting with:

```bash
npm run lint
```

For a production application, consider enabling TypeScript for enhanced type safety.

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have suggestions, please open an [issue](https://github.com/Pujarini/distill/issues) on GitHub.

---

**Happy reading with Distill! 📚**
