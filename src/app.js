import { TextField, Fade, Toolbar, Button, Box, Chip, AppBar, LinearProgress } from "@material-ui/core";
import { Autocomplete, Alert } from "@material-ui/lab";
import { Settings, PublishRounded, GetAppRounded, ArrowLeft, ArrowRight } from "@material-ui/icons";
import { useEffect, useRef, useState } from "react";

async function getWorkingDir() {
  const dialogResponse = await window.electron.dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!dialogResponse.canceled) {
    return dialogResponse.filePaths[0];
  }
}

async function getFileList(workingDir) {
  return window.fs.readdirSync(workingDir)
    .filter(f => /.*\.(png)|(jpg)|(jpeg)/.test(f));
}

function getFileTags(file) {
  return new Promise((res, rej) => {
    window.exec(`/usr/local/bin/tag -lN ${JSON.stringify(file)} `, (error, stdout, stderr) => {
      if (error) {
        return rej(error);;
      }
      return res(stdout ? stdout.split(',').map(s => s.trim()) : []);
    });
  });
}

function addTagsFs(file, tags) {
  return new Promise((res, rej) => {
    window.exec(`/usr/local/bin/tag -a ${tags.map(JSON.stringify).join(',')} ${JSON.stringify(file)} `, (error, stdout, stderr) => {
      if (error) {
        return rej(error);;
      }
      return res(stdout);
    });
  });
}

async function setTagsFs(file, tags) {
  if (tags.length === 0) {
    return await removeTagsFs(file, await getFileTags(file));
  }

  return new Promise((res, rej) => {
    window.exec(`/usr/local/bin/tag -s ${tags.map(JSON.stringify).join(',')} ${JSON.stringify(file)} `, (error, stdout, stderr) => {
      if (error) {
        return rej(error);;
      }
      return res(stdout);
    });
  });
}

function removeTagsFs(file, tags) {
  return new Promise((res, rej) => {
    window.exec(`/usr/local/bin/tag -r ${tags.map(JSON.stringify).join(',')} ${JSON.stringify(file)} `, (error, stdout, stderr) => {
      if (error) {
        return rej(error);;
      }
      return res(stdout);
    });
  });
}

function TagUpdateAlert({showAlert}) {
  const [show, setShow] = useState(false);
  const [alert, setAlert] = useState(<div />);
  const [showTimeout, setShowTimeout] = useState();

  showAlert.current = (tagsBefore, tagsToRemove, tagsToAdd, tagsToSet) => {
    let tagsRemoved = [];
    let tagsAdded = [];
    if (tagsToSet) {
      tagsRemoved = tagsBefore.filter(t => !tagsToSet.includes(t));
      tagsAdded = tagsToSet.filter(t => !tagsBefore.includes(t));
    } else if (tagsToAdd) {
      tagsAdded = tagsToAdd.filter(t => !tagsBefore.includes(t));
    } else if (tagsToRemove) {
      tagsRemoved = tagsBefore.filter(t => tagsToRemove.includes(t));
    }

    if (tagsRemoved.length > 0) {
      setAlert(<Alert severity="error">Tags removed: {tagsRemoved.join(', ')}.</Alert>);
    } else if (tagsAdded.length > 0) {
      setAlert(<Alert severity="success">Tags added: {tagsAdded.join(', ')}.</Alert>);
    } else {
      setAlert(<Alert severity="info">Tags unchanged.</Alert>);
    }
    setShow(true);
    if (showTimeout) {
      clearTimeout(showTimeout);
    }
    setShowTimeout(setTimeout(() => setShow(false), 3000));
  };

  return <Box style={{position: 'fixed', top: 110, left: 20}}>
      <Fade in={show}>
      {alert}
    </Fade>
    </Box>
}

function App() {
  const [workingDir, setWorkingDir] = useState(window.localStorage.getItem('workingDir'));
  const [workingTags, setWorkingTags] = useState(JSON.parse(window.localStorage.getItem('workingTags') || '[]'));
  const [workingFileList, setWorkingFileList] = useState([]);
  const [workingFileIndex, setWorkingFileIndex] = useState(0);
  const [workingFileTags, setWorkingFileTags] = useState([]);

  const showAlert = useRef(() => {});

  async function addTags() {
    if (workingFileList.length) {
      await addTagsFs(`${workingDir}/${workingFileList[workingFileIndex]}`, workingTags);
      showAlert.current(workingFileTags, undefined, workingTags);
    }
  }

  async function removeTags() {
    if (workingFileList.length) {
      await removeTagsFs(`${workingDir}/${workingFileList[workingFileIndex]}`, workingTags);
      showAlert.current(workingFileTags, workingTags, undefined);
    }
  }

  async function setTags(tags) {
    if (workingFileList.length) {
      await setTagsFs(`${workingDir}/${workingFileList[workingFileIndex]}`, tags);
      showAlert.current(workingFileTags, undefined, undefined, tags);
    }
  }

  function previousImage() {
    if (workingFileList.length) {
      let nextIndex = workingFileIndex - 1;
      if (nextIndex < 0) {
        nextIndex += workingFileList.length;
      }
      setWorkingFileIndex(nextIndex);
    }
  }
  function nextImage() {
    if (workingFileList.length) {
      let nextIndex = workingFileIndex + 1;
      if (nextIndex >= workingFileList.length) {
        nextIndex -= workingFileList.length;
      }
      setWorkingFileIndex(nextIndex);
    }
  }

  async function onClickAddWorkingTags() {
    if (workingFileList.length) {
      await addTags();
      nextImage();
    }
  }

  async function onClickRemoveWorkingTags() {
    if (workingFileList.length) {
      await removeTags();
      nextImage();
    }
  }

  const keydownEventHandler = useRef();
  keydownEventHandler.current = async (event) => {
    if (workingFileList.length > 0) {
      switch (event.keyCode) {
        case 37: // left
          previousImage();
          break;
        case 39: // right
          nextImage();
          break;
        case 40: // down
          onClickRemoveWorkingTags();
          break;
        case 38: // up
          onClickAddWorkingTags();
          break;
      }
    }
  }

  useEffect(() => {
    function keyDownEvent(event) {
      keydownEventHandler.current(event);
    }
    window.addEventListener("keydown", keyDownEvent);
    return () => {
      window.removeEventListener("keydown", keyDownEvent);
    }
  }, []);

  useEffect(() => {
    if (workingDir) {
      getFileList(workingDir).then(setWorkingFileList);
      setWorkingFileIndex(0);
    }
  }, [workingDir]);

  useEffect(() => {
    if (workingDir && workingFileList.length) {
      getFileTags(`${workingDir}/${workingFileList[workingFileIndex]}`).then(setWorkingFileTags);
    }
  }, [workingFileList, workingFileIndex, workingDir]);

  const onClickChangeWorkingDir = async () => {
    const dir = await getWorkingDir();
    if (dir) {
      setWorkingFileIndex(0);
      setWorkingFileList([]);
      setWorkingDir(dir);
      window.localStorage.setItem('workingDir', dir);
    }
  }

  const onChangeUpdateWorkingTags = async (event, values) => {
    setWorkingTags(values);
    window.localStorage.setItem('workingTags', JSON.stringify(values));
  }

  const onChangeUpdateWorkingImageTags = async (event, values) => {
    await setTags(values);
    setWorkingFileTags(values);
  }

  let currentImageDisplay = null;
  if (workingFileList.length) {
    currentImageDisplay = <div>
      <Box style={{
        padding: 0,
        paddingTop: 130,
        paddingBottom: 130,
      }}>
            <img style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '90%', 
              maxHeight: '80vh', 
              boxShadow: '0px 0px 50px 3px rgba(0, 0, 0, 0.4)' 
            }} src={`file://${workingDir}/${workingFileList[workingFileIndex]}`}></img>
      </Box>
      <AppBar position="fixed" style={{ backgroundColor: '#464342', bottom: 0, top: 'auto' }}>
        <Toolbar style={{ margin: 0, padding: 10, paddingLeft: 20, paddingRight: 20 }}>
          <Autocomplete
            style={{ minWidth: '100%' }}
            multiple
            options={[...workingTags]}
            getOptionLabel={(option) => option}
            renderTags={(tags, getTagProps) => [
              ...tags.filter(t => !!t).map((tag, index) => <Chip
                label={workingTags.includes(tag) ?  <span style={{color: '#c7f29b'}}>{tag}</span> : tag }
                // size={size}
                {...getTagProps({ index })}
              />),
              ...workingTags.filter(tag => !tags.includes(tag)).map((tag, index) => <Chip 
                key={'unusedTag'+index}
                variant="outlined" 
                label={tag} 
                style={{ margin: 3, color: '#8f8f8f'}}
                onClick={e => onChangeUpdateWorkingImageTags(e, [...tags.filter(t => !!t), tag])}
              />)
            ]}
            value={[...workingFileTags, null]}
            filterSelectedOptions
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Tags on This Image"
              />
            )}
            onChange={(e, v) => onChangeUpdateWorkingImageTags(e, v.filter(t => !!t))}
          />
        </Toolbar>
      </AppBar>
    </div>
  }

  return <div>
    <AppBar position="fixed" style={{ backgroundColor: '#464342' }}>
      <Toolbar style={{ margin: 0, padding: 10, paddingLeft: 20 }}>
        <Autocomplete
          style={{ minWidth: '50%' }}
          multiple
          options={[]}
          getOptionLabel={(option) => option}
          defaultValue={workingTags}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Working Tags"
            />
          )}
          onChange={onChangeUpdateWorkingTags}
        />
        <div style={{ flexGrow: 1 }}>

        </div>
        <Button onClick={previousImage} style={{ marginRight: 10 }} variant="outlined"><ArrowLeft /></Button>
        <Button onClick={nextImage} style={{ marginRight: 10 }} variant="outlined"><ArrowRight /></Button>
        <Button onClick={onClickAddWorkingTags} style={{ marginRight: 10, color: '#c7f29b', borderColor: '#c7f29b' }} variant="outlined"><PublishRounded /> </Button>
        <Button onClick={onClickRemoveWorkingTags} style={{ marginRight: 10, color: '#f29baf', borderColor: '#f29baf' }} variant="outlined"><GetAppRounded /> </Button>
        <Button onClick={onClickChangeWorkingDir}><Settings /></Button>
      </Toolbar>
      <LinearProgress variant="determinate" value={workingFileList.length
        ? 100 * (workingFileIndex + 1) / workingFileList.length
        : 0
      } />
    </AppBar>
    {currentImageDisplay}
    {<TagUpdateAlert showAlert={showAlert}/>}
  </div>;
}

export default App;

