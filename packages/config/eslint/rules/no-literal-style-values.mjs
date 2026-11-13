// Fails on literal colours and sizes in code: every visual value comes from the
// design tokens (CLAUDE.md › Working rules; architecture.md: "The hard-coded
// value lint rule breaks the build").
//
// Reported:
// - colour literals in strings: #rgb/#rrggbb(aa), rgb(), hsl(), hwb(), lab(), lch(), oklab(), oklch(), color()
// - length literals in strings: 12px, 1.5rem, 2em
// - numbers in JSX style objects for size/spacing/position/type properties (style={{ padding: 8 }})

const HEX = /(?<![\w&/#-])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])/i;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const LENGTH = /(?<![\w.-])-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em)(?![\w-])/i;
const SIZED_STYLE_PROPERTY =
  /^(?:width|height|min(?:Width|Height)|max(?:Width|Height)|margin\w*|padding\w*|gap|rowGap|columnGap|top|right|bottom|left|inset\w*|fontSize|lineHeight|letterSpacing|border\w*(?:Width|Radius)|outline(?:Width|Offset)|flexBasis)$/;

function literalKind(text) {
  if (HEX.test(text) || COLOR_FUNCTION.test(text)) return "colour";
  if (LENGTH.test(text)) return "size";
  return null;
}

function isModuleSpecifier(node) {
  const parent = node.parent;
  return (
    (parent?.type === "ImportDeclaration" || parent?.type === "ExportNamedDeclaration" || parent?.type === "ExportAllDeclaration" || parent?.type === "ImportExpression") &&
    parent.source === node
  );
}

function isDirective(node) {
  return node.parent?.type === "ExpressionStatement" && typeof node.parent.directive === "string";
}

function propertyName(property) {
  if (property.computed) return null;
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal") return String(property.key.value);
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: { description: "Disallow literal colours and sizes; use design tokens." },
    schema: [],
    messages: {
      literal: "Literal {{kind}} \"{{text}}\": use a design token (Tailwind theme class or var(--…)) instead.",
      styleNumber: "Literal {{property}}: {{value}} in a style object: use a design token instead.",
    },
  },
  create(context) {
    const reportText = (node, text) => {
      const kind = literalKind(text);
      if (kind) context.report({ node, messageId: "literal", data: { kind, text: text.length > 60 ? `${text.slice(0, 57)}…` : text } });
    };
    return {
      Literal(node) {
        if (typeof node.value !== "string" || isModuleSpecifier(node) || isDirective(node)) return;
        reportText(node, node.value);
      },
      TemplateElement(node) {
        reportText(node, node.value.cooked ?? node.value.raw);
      },
      "JSXAttribute[name.name='style'] ObjectExpression > Property"(node) {
        const name = propertyName(node);
        if (!name || !SIZED_STYLE_PROPERTY.test(name)) return;
        const value = node.value.type === "UnaryExpression" ? node.value.argument : node.value;
        if (value.type === "Literal" && typeof value.value === "number" && value.value !== 0) {
          context.report({ node: node.value, messageId: "styleNumber", data: { property: name, value: String(value.value) } });
        }
      },
    };
  },
};
