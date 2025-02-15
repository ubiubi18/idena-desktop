import React from 'react'
import PropTypes from 'prop-types'
import theme from '../theme'
import {Dim} from './box'

export function Heading({
  color,
  fontSize,
  fontWeight,
  margin,
  style,
  children,
}) {
  return (
    <h1 style={style}>
      {children}
      <style jsx>{`
        h1 {
          display: inline-block;
          color: ${color};
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          margin: ${margin};
        }
      `}</style>
    </h1>
  )
}

Heading.defaultProps = {
  ...theme.Heading,
}

Heading.propTypes = {
  color: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.number,
  margin: Dim,
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object,
  children: PropTypes.node,
}

export function SubHeading({
  color,
  fontSize,
  fontWeight,
  margin,
  css,
  children,
}) {
  return (
    <h2 style={css}>
      {children}
      <style jsx>{`
        h2 {
          display: inline-block;
          color: ${color};
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          ${margin};
          margin: 0.25em 0;
          width: 100%;
        }
      `}</style>
    </h2>
  )
}

SubHeading.defaultProps = {
  ...theme.SubHeading,
}

SubHeading.propTypes = {
  color: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.number,
  margin: Dim,
  // eslint-disable-next-line react/forbid-prop-types
  css: PropTypes.object,
  children: PropTypes.node,
}

export function BlockHeading({color, fontSize, fontWeight, css, children}) {
  return (
    <h3 style={css}>
      {children}
      <style jsx>{`
        h3 {
          display: inline-block;
          color: ${color};
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          margin: 0 0 0.7rem;
          width: 100%;
        }
      `}</style>
    </h3>
  )
}

BlockHeading.defaultProps = {
  ...theme.BlockHeading,
}

BlockHeading.propTypes = {
  color: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.number,
  css: PropTypes.object,
  children: PropTypes.node,
}

export function Text({color, fontSize, fontWeight, css, ...props}) {
  return (
    <>
      <span {...props} style={css} />
      <style jsx>{`
        span {
          display: inline-block;
          color: ${color};
          font-size: ${fontSize};
          font-weight: ${fontWeight};
        }
      `}</style>
    </>
  )
}

Text.defaultProps = {
  ...theme.Text,
}

Text.propTypes = {
  color: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.number,
  // eslint-disable-next-line react/forbid-prop-types
  css: PropTypes.object,
}

// eslint-disable-next-line react/prop-types
export function BlockText({css, ...props}) {
  return <Text {...props} css={{...css, display: 'block'}} />
}
