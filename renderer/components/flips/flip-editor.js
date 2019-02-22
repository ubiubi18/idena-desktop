//@ts-check

import React, {Component} from 'react'
import {encode} from 'rlp'
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd'

import * as api from '../../services/api'
import styles from '../../styles/components/flips/flip-editor'
import {arrToFormData} from '../../utils/req'
import {FlipCrop} from './flip-crop'
import {FlipDrop} from './flip-drop'
import {FlipRenderer} from './flip-renderer'
import {createFlip} from '../../services/flipotron'

const grid = 8

const getItemStyle = (isDragging, draggableStyle) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: 'none',
  padding: grid * 2,
  margin: `0 0 ${grid}px 0`,

  // change background colour if dragging
  background: isDragging ? 'lightgreen' : 'grey',

  // styles we need to apply on draggables
  ...draggableStyle,
})

const getListStyle = isDraggingOver => ({
  background: isDraggingOver ? 'lightblue' : 'lightgrey',
  padding: grid,
  width: 250,
})

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)

  return result
}

export class FlipEditor extends Component {
  state = {
    showDropZone: false,
    origSrc: '',
    canUpload: true,
    flip: createFlip(new Array(4), [new Array(4), new Array(4)]),
  }

  canvasRefs = []
  idx = 0

  handleUpload = e => {
    e.preventDefault()

    const file = (e.target.files || e.dataTransfer.files)[0]

    if (file && file.type.indexOf('image') !== 0) {
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', e => {
      this.setState({
        // @ts-ignore
        origSrc: e.target.result,
      })
    })
    reader.readAsDataURL(file)
  }

  handleDrop = files => {
    api.submitFlip(arrToFormData(files))
  }

  handleCropSave = (src, crop) =>
    this.state.canUpload &&
    this.setState(
      ({flip}) => {
        flip.flips[this.idx] = {
          src,
          crop,
        }
        flip.compare.options.forEach(option => {
          option[this.idx] = this.idx
        })
        return {
          flip,
          canUpload: this.idx < flip.flips.length - 1,
        }
      },
      () => {
        this.idx++
        console.log(this.state.flip.compare)
      }
    )

  handleSubmitFlip = () => {
    let arr = []
    for (const canvas of this.canvasRefs) {
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      arr.push(Buffer.from(data))
    }
    const hex = encode([...arr, this.state.flip.compare.options])
    const hash = api.submitFlip(hex)
    console.log(hash)
  }

  handleDragEnd = idx => result => {
    // dropped outside the list
    if (!result.destination) {
      return
    }

    const items = reorder(
      this.state.flip.compare.options[idx],
      result.source.index,
      result.destination.index
    )

    this.setState(
      ({flip}) => {
        flip.compare.options[idx] = items
        return {
          flip,
        }
      },
      () => {
        console.log(this.state)
      }
    )
  }

  render() {
    const {
      showDropZone,
      origSrc,
      flip: {
        name,
        flips,
        compare: {options},
      },
    } = this.state
    return (
      <>
        <h2>FLIPs</h2>
        <div onDragEnter={this.showDropZone}>
          {showDropZone && (
            <FlipDrop
              darkMode={false}
              onDrop={this.handleUpload}
              onHide={this.hideDropZone}
            />
          )}
          Drag and drop your pics here or upload manually{' '}
          <input
            type="file"
            onChange={this.handleUpload}
            disabled={!this.state.canUpload}
          />
        </div>
        {origSrc && (
          <div>
            <FlipCrop
              src={origSrc}
              onCropSave={this.handleCropSave}
              disabled={!this.state.canUpload}
            />
            <h2>{name}</h2>
            <h3>Reference pics</h3>
            {flips.map((pic, idx) => (
              <FlipRenderer
                key={idx}
                {...pic}
                id={`canvas${idx}`}
                canvasRef={node => this.canvasRefs.push(node)}
              />
            ))}
            <h3>Options</h3>
            <div className="row">
              {options.map((option, optionIdx) => (
                <div>
                  <DragDropContext onDragEnd={this.handleDragEnd(optionIdx)}>
                    <Droppable droppableId={`droppable${optionIdx}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          style={getListStyle(snapshot.isDraggingOver)}
                        >
                          {option.map((refIdx, idx) => (
                            <Draggable
                              key={`flip-draggable-${refIdx}-${optionIdx}`}
                              draggableId={`flip-${refIdx}-${optionIdx}`}
                              index={idx}
                            >
                              {(provided, snapshot) =>
                                flips[refIdx] && (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={getItemStyle(
                                      snapshot.isDragging,
                                      provided.draggableProps.style
                                    )}
                                  >
                                    <FlipRenderer
                                      key={`flip-${refIdx}-${optionIdx}`}
                                      {...flips[refIdx]}
                                      id={`cnv-${optionIdx}-${idx}`}
                                    />
                                  </div>
                                )
                              }
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              ))}
            </div>
            <button onClick={this.handleSubmitFlip} className="btn--primary">
              Submit
            </button>
          </div>
        )}
        <style jsx>{`
          ${styles}
          .row {
            display: flex;
          }
          .row > div {
            width: 50%;
          }
          .btn--primary {
            background: blue;
            color: white;
            padding: 0.5em;
            font-size: 1.6em;
            font-weight: 600;
          }
        `}</style>
      </>
    )
  }

  showDropZone = () => this.setState({showDropZone: true})

  hideDropZone = () => this.setState({showDropZone: false})
}
