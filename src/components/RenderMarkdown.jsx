import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function RenderMarkdown({ md }) {
  if (!md) return null;
  return <ReactMarkdown>{md}</ReactMarkdown>;
}