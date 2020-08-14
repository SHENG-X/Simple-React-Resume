/* eslint-disable new-cap */
import html2canvas from 'html2canvas';
import * as jsPDF from 'jspdf';

const move = (array, element, delta) => {
  const index = array.findIndex(item => item.id === element.id);
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex === array.length) return;
  const indexes = [index, newIndex].sort((a, b) => a - b);
  array.splice(indexes[0], 2, array[indexes[1]], array[indexes[0]]);
};

const hexToRgb = hex => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ?
    {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
};

const copyToClipboard = text => {
  const textArea = document.createElement('textarea');
  textArea.style.position = 'fixed';
  textArea.style.top = 0;
  textArea.style.left = 0;
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = 0;
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const successful = document.execCommand('copy');
  document.body.removeChild(textArea);
  return successful;
};

const saveData = dispatch => dispatch({ type: 'save_data' });

const addItem = (dispatch, key, value) => {
  dispatch({
    type: 'add_item',
    payload: {
      key,
      value,
    },
  });

  saveData(dispatch);
};

const deleteItem = (dispatch, key, value) => {
  dispatch({
    type: 'delete_item',
    payload: {
      key,
      value,
    },
  });

  saveData(dispatch);
};

const moveItemUp = (dispatch, key, value) => {
  dispatch({
    type: 'move_item_up',
    payload: {
      key,
      value,
    },
  });

  saveData(dispatch);
};

const moveItemDown = (dispatch, key, value) => {
  dispatch({
    type: 'move_item_down',
    payload: {
      key,
      value,
    },
  });

  saveData(dispatch);
};

const migrateSection = (dispatch, key, value) => {
  dispatch({
    type: 'migrate_section',
    payload: {
      key,
      value,
    },
  });
  dispatch({ type: 'save_data' });
};

const importJson = (event, dispatch) => {
  const fr = new FileReader();
  fr.addEventListener('load', () => {
    const importedObject = JSON.parse(fr.result);
    dispatch({ type: 'import_data', payload: importedObject });
    dispatch({ type: 'save_data' });
  });
  fr.readAsText(event.target.files[0]);
};

let saveAsPdfTimer = null;
const saveAsPdf = (pageRef, panZoomRef, quality, type, customFileName) => {
  if (saveAsPdfTimer) {
    return null;
  }
  return new Promise(resolve => {
    panZoomRef.current.autoCenter(1);
    panZoomRef.current.reset();

    saveAsPdfTimer = setTimeout(() => {
      html2canvas(pageRef.current, {
        scale: 5,
        useCORS: true,
        allowTaint: true,
      }).then(canvas => {
        const image = canvas.toDataURL('image/jpeg', quality / 100);
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: type === 'unconstrained' ? [canvas.width, canvas.height] : 'letter',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const widthRatio = pageWidth / canvas.width;
        const heightRatio = pageHeight / canvas.height;
        const ratio = widthRatio > heightRatio ? heightRatio : widthRatio;

        const canvasWidth = canvas.width * ratio;
        const canvasHeight = canvas.height * ratio;

        let marginX = 0;
        let marginY = 0;

        if (type !== 'unconstrained') {
          marginX = (pageWidth - canvasWidth) / 2;
          marginY = (pageHeight - canvasHeight) / 2;
        }

        doc.addImage(image, 'JPEG', marginX, marginY, canvasWidth, canvasHeight, null, 'SLOW');
        if(customFileName){
          doc.save(`${customFileName}.pdf`);
        }else{
          doc.save(`simple_resume_${new Date().toLocaleString()}.pdf`);
        }
        saveAsPdfTimer = null;
        resolve();
      });
    }, 250);
  });
}
    
let saveAsMultiPagePdfTimer = null;
const saveAsMultiPagePdf = (pageRef, panZoomRef, quality, customFileName) => {
  if(saveAsMultiPagePdfTimer){
    return null;
  }
  return new Promise(resolve => {
    panZoomRef.current.autoCenter(1);
    panZoomRef.current.reset();

    saveAsMultiPagePdfTimer = setTimeout(() => {
      html2canvas(pageRef.current, {
        scale: 5,
        useCORS: true,
        allowTaint: true,
      }).then(canvas => {
        const image = canvas.toDataURL('image/jpeg', quality / 100);
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: 'letter',
        });

        const pageHeight = doc.internal.pageSize.getHeight();
        const canvasWidth = doc.internal.pageSize.getWidth();
        const canvasHeight = (canvas.height * canvasWidth) / canvas.width;
        let marginTop = 0;
        let heightLeft = canvasHeight;

        doc.addImage(image, 'JPEG', 0, marginTop, canvasWidth, canvasHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          marginTop = heightLeft - canvasHeight;
          doc.addPage();
          doc.addImage(image, 'JPEG', 0, marginTop, canvasWidth, canvasHeight);
          heightLeft -= pageHeight;
        }
        if(customFileName){
          doc.save(`${customFileName}.pdf`);
        }else{
          doc.save(`RxResume_${Date.now()}.pdf`);
        }
        saveAsMultiPagePdfTimer = null;
        resolve();
      });
    }, 250);
  });
}

const formatDisplayURL = (url) => {
  if(!url) return null;
  const items = url.split('/').filter(x => x !== '' && x !=='http:' && x !== 'https:');
  return items.map(i => i.replace('www.', '')).join('/');  
}

const animateUp = (ref, first, cb) => {
  if(first){
    ref.current.classList.add("animate__shakeX");
    setTimeout(() => {
      ref.current.classList.remove("animate__shakeX");
    }, 1000);
  }else{
    ref.current.classList.add("animate__slideInUp");
    setTimeout(() => {
      ref.current.classList.remove("animate__slideInUp");
    }, 1000);
  }
  cb();
}

const animateDown = (ref, last, cb) => {
  if(last){
    ref.current.classList.add("animate__shakeX");
    setTimeout(() => {
      ref.current.classList.remove("animate__shakeX");
    }, 1000);
  }else{
    ref.current.classList.add("animate__slideInDown");
    setTimeout(() => {
      ref.current.classList.remove("animate__slideInDown");
    }, 1000);
    cb();
  }
}

const animateRemove = (ref, cb) => {
  ref.current.classList.add("animate__slideOutRight");
  setTimeout(() => {
    cb();
  }, 1000)
}

export {
  move,
  hexToRgb,
  copyToClipboard,
  saveData,
  addItem,
  deleteItem,
  moveItemUp,
  moveItemDown,
  migrateSection,
  importJson,
  saveAsPdf,
  saveAsMultiPagePdf,
  formatDisplayURL,
  animateUp,
  animateDown,
  animateRemove
};
