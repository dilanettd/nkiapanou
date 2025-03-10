/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ebc435",
          hover: "#d4af23",
          focus: "rgba(235, 196, 53, 0.5)",
        },
        secondary: {
          DEFAULT: "#6c84af",
          hover: "#5a7199",
          focus: "rgba(108, 132, 175, 0.5)",
        },
        accent: {
          DEFAULT: "#dfc45b",
          hover: "#c9af41",
          focus: "rgba(223, 196, 91, 0.5)",
        },
        neutral: "#eeede5",
        base: "#eeede5",
        text: {
          DEFAULT: "#333333",
          light: "#666666",
          dark: "#111111",
          white: "#FFFFFF",
        },
        background: {
          light: "#FFFFFF",
          dark: "#333333",
        },
      },
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        body: ["Lato", "sans-serif"],
      },
      borderRadius: {
        button: "0.25rem",
      },
      boxShadow: {
        "button-focus": "0 0 0 3px rgba(235, 196, 53, 0.5)",
        "button-secondary-focus": "0 0 0 3px rgba(108, 132, 175, 0.5)",
        "button-accent-focus": "0 0 0 3px rgba(223, 196, 91, 0.5)",
        "input-focus": "0 0 0 3px rgba(235, 196, 53, 0.3)",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#333333",
            maxWidth: "65ch",
            h1: {
              fontFamily: "Playfair Display, serif",
              fontWeight: "700",
              color: "#ebc435",
            },
            h2: {
              fontFamily: "Playfair Display, serif",
              fontWeight: "600",
              color: "#ebc435",
            },
            h3: {
              fontFamily: "Playfair Display, serif",
              fontWeight: "600",
              color: "#333333",
            },
            p: {
              fontFamily: "Lato, sans-serif",
            },
            strong: {
              color: "#ebc435",
              fontWeight: "700",
            },
            a: {
              color: "#ebc435",
              "&:hover": {
                color: "#d4af23",
              },
            },
          },
        },
        dark: {
          css: {
            color: "#FFFFFF",
            h1: {
              color: "#ebc435",
            },
            h2: {
              color: "#ebc435",
            },
            h3: {
              color: "#FFFFFF",
            },
            strong: {
              color: "#ebc435",
            },
            a: {
              color: "#ebc435",
              "&:hover": {
                color: "#d4af23",
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    function ({ addBase, theme }) {
      addBase({
        ".bg-white": {
          "& p, & li, & h3, & h4, & h5, & h6": {
            color: theme("colors.text.DEFAULT"),
          },
        },
        ".bg-colored": {
          "& p, & li, & h3, & h4, & h5, & h6": {
            color: theme("colors.text.white"),
          },
        },
      });
    },
    function ({ addComponents, theme }) {
      const buttons = {
        ".btn": {
          fontFamily: theme("fontFamily.body"),
          padding: ".5rem 1rem",
          borderRadius: theme("borderRadius.button"),
          fontWeight: "550",
          display: "inline-block",
          cursor: "pointer",
          transition:
            "background-color 150ms ease, transform 100ms ease, box-shadow 150ms ease",
          "&:focus": {
            outline: "none",
            boxShadow: theme("boxShadow.button-focus"),
          },
          "&:active": {
            transform: "scale(0.98)",
          },
        },
        ".btn-primary": {
          backgroundColor: theme("colors.primary.DEFAULT"),
          color: "#FFFFFF",
          "&:hover": {
            backgroundColor: theme("colors.primary.hover"),
          },
          "&:focus": {
            boxShadow: theme("boxShadow.button-focus"),
          },
        },
        ".btn-secondary": {
          backgroundColor: theme("colors.secondary.DEFAULT"),
          color: "#FFFFFF",
          "&:hover": {
            backgroundColor: theme("colors.secondary.hover"),
          },
          "&:focus": {
            boxShadow: theme("boxShadow.button-secondary-focus"),
          },
        },
        ".btn-accent": {
          backgroundColor: theme("colors.accent.DEFAULT"),
          color: "#FFFFFF",
          "&:hover": {
            backgroundColor: theme("colors.accent.hover"),
          },
          "&:focus": {
            boxShadow: theme("boxShadow.button-accent-focus"),
          },
        },
        ".btn-outline": {
          backgroundColor: "transparent",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: theme("colors.primary.DEFAULT"),
          color: theme("colors.primary.DEFAULT"),
          "&:hover": {
            backgroundColor: "rgba(235, 196, 53, 0.1)",
          },
        },
        ".btn-outline-secondary": {
          backgroundColor: "transparent",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: theme("colors.secondary.DEFAULT"),
          color: theme("colors.secondary.DEFAULT"),
          "&:hover": {
            backgroundColor: "rgba(108, 132, 175, 0.1)",
          },
        },
        ".btn-sm": {
          padding: ".25rem .75rem",
          fontSize: "0.875rem",
        },
        ".btn-lg": {
          padding: ".75rem 1.5rem",
          fontSize: "1.125rem",
        },
      };

      addComponents(buttons);
    },
    // Ajout du plugin pour personnaliser les inputs
    function ({ addComponents, theme }) {
      const inputs = {
        'input[type="text"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], input[type="url"], input[type="search"], textarea, select':
          {
            borderColor: "#D6D2B1",
            borderWidth: "1px",
            borderRadius: theme("borderRadius.button"),
            padding: ".5rem .75rem",
            transition: "all 150ms ease",
            backgroundColor: "#FFFFFF",
            color: theme("colors.text.DEFAULT"),
            "&:focus": {
              outline: "none",
              borderColor: theme("colors.primary.hover"),
              boxShadow: theme("boxShadow.input-focus"),
            },
            "&::placeholder": {
              color: theme("colors.text.light"),
            },
          },
        // Variantes pour les états disabled et error
        "input:disabled, textarea:disabled, select:disabled": {
          backgroundColor: theme("colors.neutral"),
          borderColor: theme("colors.text.light"),
          cursor: "not-allowed",
          opacity: "0.7",
        },
        ".input-error": {
          borderColor: "#e53e3e",
          "&:focus": {
            boxShadow: "0 0 0 3px rgba(229, 62, 62, 0.3)",
          },
        },
      };

      addComponents(inputs);
    },
  ],
};
