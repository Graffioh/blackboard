chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: "blackboard.html",
    type: "popup",
    width: 800,
    height: 500,
    focused: true,
  });
});
