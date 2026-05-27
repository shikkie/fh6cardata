import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Searchable combobox — replaces a native <select> when the option list is long.
 *
 * Props
 *   value        – currently selected option value ('' means nothing selected)
 *   onChange     – (value: string) => void
 *   options      – string[] | { value: string, label: string }[]
 *   placeholder  – text shown when nothing is selected
 *   className    – extra classes for the wrapper div
 */
export default function ComboBox({ value, onChange, options, placeholder = 'Select…', className = '' }) {
  // Normalise to { value, label } pairs
  const normalised = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o))

  const [inputText, setInputText]       = useState('')
  const [isOpen, setIsOpen]             = useState(false)
  const [highlighted, setHighlighted]   = useState(-1)

  const wrapperRef  = useRef(null)
  const inputRef    = useRef(null)
  const listRef     = useRef(null)

  // Keep the input text in sync with the controlled value
  useEffect(() => {
    if (!value) {
      setInputText('')
    } else {
      const match = normalised.find(o => o.value === value)
      setInputText(match ? match.label : value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Filter options by what the user has typed; empty input → show all
  const filtered = inputText.trim()
    ? normalised.filter(o => o.label.toLowerCase().includes(inputText.toLowerCase()))
    : normalised

  // Close when clicking outside
  useEffect(() => {
    const onMouseDown = e => {
      if (!wrapperRef.current?.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Scroll the highlighted option into view
  useEffect(() => {
    if (!listRef.current || highlighted < 0) return
    const item = listRef.current.children[highlighted]
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  const selectOption = useCallback((opt) => {
    onChange(opt.value)
    setInputText(opt.label)
    setIsOpen(false)
    setHighlighted(-1)
  }, [onChange])

  const clearSelection = useCallback((e) => {
    e.stopPropagation()
    onChange('')
    setInputText('')
    setIsOpen(false)
    inputRef.current?.focus()
  }, [onChange])

  function handleInputChange(e) {
    setInputText(e.target.value)
    setIsOpen(true)
    setHighlighted(-1)
    // If the user clears the text entirely, also clear the filter value
    if (!e.target.value) onChange('')
  }

  function handleKeyDown(e) {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true)
      setHighlighted(0)
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlighted(h => Math.min(h + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted(h => Math.max(h - 1, 0))
        break
      case 'Enter':
        if (highlighted >= 0 && filtered[highlighted]) selectOption(filtered[highlighted])
        break
      case 'Escape':
        setIsOpen(false)
        // Restore text to the selected label (or empty if nothing selected)
        if (!value) setInputText('')
        else {
          const match = normalised.find(o => o.value === value)
          setInputText(match ? match.label : value)
        }
        break
      case 'Tab':
        setIsOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={wrapperRef} className={`combobox-wrapper${className ? ` ${className}` : ''}`}>
      <div className="combobox-input-row">
        <input
          ref={inputRef}
          type="text"
          className="form-control form-control-sm combobox-input"
          value={inputText}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          onFocus={() => { setIsOpen(true); setHighlighted(-1) }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {value
          ? (
            <button
              className="combobox-clear"
              tabIndex={-1}
              aria-label="Clear"
              onClick={clearSelection}
            >
              <i className="fas fa-xmark" />
            </button>
          ) : (
            <span className="combobox-caret" aria-hidden="true">
              <i className="fas fa-chevron-down" />
            </span>
          )
        }
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          className="combobox-dropdown"
          role="listbox"
        >
          {filtered.length === 0
            ? <li className="combobox-empty">No matches</li>
            : filtered.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={[
                  'combobox-option',
                  i === highlighted          ? 'combobox-option-hl' : '',
                  opt.value === value        ? 'combobox-option-sel' : '',
                ].filter(Boolean).join(' ')}
                onMouseDown={e => { e.preventDefault(); selectOption(opt) }}
                onMouseEnter={() => setHighlighted(i)}
              >
                {opt.label}
              </li>
            ))
          }
        </ul>
      )}
    </div>
  )
}
