
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { PaycheckDisassembly3D } from "./PaycheckDisassembly3D";

export const Root = () => {
  return (
    <>
      <Composition
        id="WhiteboardWalletVideo"
        component={MainVideo}
        durationInFrames={11309}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="PaycheckDisassembly3D"
        component={PaycheckDisassembly3D}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
