import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Printer, Search, Type } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LegalLayout({ title, children }) {
  const [fontScale, setFontScale] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    document.documentElement.style.setProperty('--legal-font-scale', String(fontScale));
  }, [fontScale]);

  const handlePrint = () => {
    window.print();
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    // Simple highlight functionality
    if (term) {
      // Remove existing highlights
      const walker = document.createTreeWalker(
        document.querySelector('.legal-content'),
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.toLowerCase().includes(term.toLowerCase())) {
          const parent = node.parentNode;
          const highlightedText = node.textContent.replace(
            new RegExp(term, 'gi'),
            '<mark class="bg-yellow-300">$&</mark>'
          );
          parent.innerHTML = highlightedText;
        }
      }
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Tools */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="glass rounded-xl text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-white">{title}</h1>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Font Size Controls */}
              <div className="flex items-center gap-1 glass rounded-lg p-1">
                <Button
                  size="sm"
                  variant={fontScale === 1 ? "default" : "ghost"}
                  onClick={() => setFontScale(1)}
                  className="h-8 w-8 text-sm"
                  title="Normale Schriftgröße"
                >
                  <Type className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant={fontScale === 1.125 ? "default" : "ghost"}
                  onClick={() => setFontScale(1.125)}
                  className="h-8 w-8 text-sm"
                  title="Große Schriftgröße"
                >
                  <Type className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={fontScale === 1.25 ? "default" : "ghost"}
                  onClick={() => setFontScale(1.25)}
                  className="h-8 w-8 text-sm"
                  title="Sehr große Schriftgröße"
                >
                  <Type className="w-5 h-5" />
                </Button>
              </div>

              {/* Print Button */}
              <Button
                size="sm"
                onClick={handlePrint}
                variant="outline"
                className="glass border-white/30 text-white hover:bg-white/10"
                title="Drucken / Als PDF speichern"
              >
                <Printer className="w-4 h-4 mr-2" />
                Drucken / PDF
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              placeholder="Text suchen..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                if (value.length > 2) {
                  handleSearch(value);
                }
              }}
              className="glass border-white/30 text-white placeholder-white/60 pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="glass rounded-2xl p-8">
          <article className="legal-content legal-prose prose prose-invert max-w-none">
            {children}
          </article>
          
          <div className="mt-8 pt-6 border-t border-white/20 text-sm text-white/60 text-center">
            <p>Zuletzt aktualisiert: 22.09.2025 • Version: 1.0</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .legal-prose {
          font-size: calc(1.05rem * var(--legal-font-scale, 1));
          line-height: 1.8;
          max-width: 70ch;
          margin: 0 auto;
        }
        
        .legal-prose h1, .legal-prose h2, .legal-prose h3 {
          font-weight: 700;
          color: #fff;
        }
        
        .legal-prose h1 { 
          font-size: calc(1.8rem * var(--legal-font-scale, 1)); 
          margin-bottom: 1em; 
        }
        
        .legal-prose h2 { 
          font-size: calc(1.4rem * var(--legal-font-scale, 1)); 
          margin-top: 1.5em; 
          margin-bottom: 0.8em; 
        }
        
        .legal-prose h3 {
          font-size: calc(1.2rem * var(--legal-font-scale, 1));
          margin-top: 1.2em;
          margin-bottom: 0.6em;
        }
        
        .legal-prose p, .legal-prose li { 
          margin-bottom: 0.8em;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .legal-prose a { 
          color: #a5b4fc; 
          text-decoration: underline; 
        }
        
        .legal-prose hr { 
          border-color: rgba(255, 255, 255, 0.2); 
          margin: 2em 0; 
        }

        .legal-prose ul > li::before {
          background-color: #93c5fd;
        }

        @media print {
          body, .min-h-screen {
            background: #fff !important;
            color: #000 !important;
          }
          
          .glass, .gradient-bg, nav, footer, .not-prose {
            display: none !important;
          }
          
          .legal-prose {
            color: #000 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          
          .legal-prose h1, .legal-prose h2, .legal-prose h3, .legal-prose strong {
            color: #000 !important;
          }
          
          .legal-prose p, .legal-prose li {
            color: #000 !important;
          }
          
          .legal-prose a {
            color: #000 !important;
            text-decoration: none;
          }

          mark {
            background: none !important;
          }
        }
      `}</style>
    </div>
  );
}