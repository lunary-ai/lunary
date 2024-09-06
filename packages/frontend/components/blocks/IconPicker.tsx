import { ActionIcon, Flex, Popover } from "@mantine/core";

import {
  IconAccessPoint,
  IconAdjustments,
  IconAlarm,
  IconAlertCircle,
  IconAlertOctagon,
  IconAlertTriangle,
  IconAmbulance,
  IconAnalyze,
  IconAnchor,
  IconApps,
  IconMoustache,
  IconTrash,
  IconBug,
  IconBubble,
  IconBulb,
  IconBuilding,
  IconMug,
  IconBuildingStore,
  IconBus,
  IconShoppingBag,
  IconMessage,
  IconBuildingPavilion,
  IconHammer,
  IconBriefcase,
  IconTarget,
  IconPlaylistAdd,
  IconMusic,
  IconWalk,
  IconBan,
  IconBandage,
  IconAward,
  IconThumbUp,
  IconThumbDown,
  IconZoom,
  IconZzz,
  IconWorld,
  IconTicket,
  IconTorii,
  IconTrafficCone,
  IconTrain,
  IconTrafficLights,
  IconTrendingUp,
  IconTrendingDown,
  IconShieldCheck,
  IconShieldCode,
  IconSend,
  IconSchema,
  IconSatellite,
  IconPaw,
  IconPencil,
  IconPennant,
  IconPepper,
  IconPentagon,
  IconHexagon,
  IconPhone,
  IconPhoto,
  IconPhotoScan,
  IconNetwork,
  IconNavigation,
  IconNews,
  IconMessage2Question,
  IconMessage2Search,
  IconMessage2Share,
  IconMessage2Bolt,
  IconMessage2Star,
  IconMessage2Dollar,
  IconMedal,
  IconMasksTheater,
  IconMarkdown,
  IconCode,
  IconScript,
  IconFilter,
  IconStethoscope,
  IconBrandOpenai,
  IconViewfinder,
  IconInbox,
  IconPlane,
  IconPlanet,
  IconUmbrella,
  IconUserPlus,
  IconUserMinus,
  IconUserCheck,
  IconUser,
  IconPizza,
  IconGitPullRequest,
  IconMail,
  IconBinaryTree2,
  IconStack3,
  IconStack2,
  IconFlag,
  IconFlame,
  IconFlask,
} from "@tabler/icons-react";

const ALL_ICONS = [
  { name: "IconAnalyze", icon: IconAnalyze },
  { name: "IconTrash", icon: IconTrash },
  { name: "IconAccessPoint", icon: IconAccessPoint },
  { name: "IconAdjustments", icon: IconAdjustments },
  { name: "IconAlarm", icon: IconAlarm },
  { name: "IconAlertCircle", icon: IconAlertCircle },
  { name: "IconAlertOctagon", icon: IconAlertOctagon },
  { name: "IconAlertTriangle", icon: IconAlertTriangle },
  { name: "IconAmbulance", icon: IconAmbulance },
  { name: "IconMoustache", icon: IconMoustache },
  { name: "IconAnchor", icon: IconAnchor },
  { name: "IconApps", icon: IconApps },
  { name: "IconBug", icon: IconBug },
  { name: "IconBubble", icon: IconBubble },
  { name: "IconBulb", icon: IconBulb },
  { name: "IconBuilding", icon: IconBuilding },
  { name: "IconMug", icon: IconMug },
  { name: "IconBuildingStore", icon: IconBuildingStore },
  { name: "IconBus", icon: IconBus },
  { name: "IconShoppingBag", icon: IconShoppingBag },
  { name: "IconMessage", icon: IconMessage },
  { name: "IconBuildingPavilion", icon: IconBuildingPavilion },
  { name: "IconHammer", icon: IconHammer },
  { name: "IconBriefcase", icon: IconBriefcase },
  { name: "IconTarget", icon: IconTarget },
  { name: "IconPlaylistAdd", icon: IconPlaylistAdd },
  { name: "IconMusic", icon: IconMusic },
  { name: "IconWalk", icon: IconWalk },
  { name: "IconBan", icon: IconBan },
  { name: "IconBandage", icon: IconBandage },
  { name: "IconAward", icon: IconAward },
  { name: "IconThumbUp", icon: IconThumbUp },
  { name: "IconThumbDown", icon: IconThumbDown },
  { name: "IconZoom", icon: IconZoom },
  { name: "IconBrandOpenai", icon: IconBrandOpenai },
  { name: "IconInbox", icon: IconInbox },
  { name: "IconViewfinder", icon: IconViewfinder },
  { name: "IconPlane", icon: IconPlane },
  { name: "IconPlanet", icon: IconPlanet },
  { name: "IconUmbrella", icon: IconUmbrella },
  { name: "IconUserPlus", icon: IconUserPlus },
  { name: "IconUserMinus", icon: IconUserMinus },
  { name: "IconUserCheck", icon: IconUserCheck },
  { name: "IconUser", icon: IconUser },
  { name: "IconPizza", icon: IconPizza },
  { name: "IconGitPullRequest", icon: IconGitPullRequest },
  { name: "IconZzz", icon: IconZzz },
  { name: "IconWorld", icon: IconWorld },
  { name: "IconTicket", icon: IconTicket },
  { name: "IconTorii", icon: IconTorii },
  { name: "IconTrafficCone", icon: IconTrafficCone },
  { name: "IconTrain", icon: IconTrain },
  { name: "IconTrafficLights", icon: IconTrafficLights },
  { name: "IconTrendingUp", icon: IconTrendingUp },
  { name: "IconTrendingDown", icon: IconTrendingDown },
  { name: "IconShieldCheck", icon: IconShieldCheck },
  { name: "IconShieldCode", icon: IconShieldCode },
  { name: "IconSend", icon: IconSend },
  { name: "IconSchema", icon: IconSchema },
  { name: "IconSatellite", icon: IconSatellite },
  { name: "IconPaw", icon: IconPaw },
  { name: "IconPencil", icon: IconPencil },
  { name: "IconPennant", icon: IconPennant },
  { name: "IconPepper", icon: IconPepper },
  { name: "IconPentagon", icon: IconPentagon },
  { name: "IconHexagon", icon: IconHexagon },
  { name: "IconPhone", icon: IconPhone },
  { name: "IconPhoto", icon: IconPhoto },
  { name: "IconPhotoScan", icon: IconPhotoScan },
  { name: "IconNetwork", icon: IconNetwork },
  { name: "IconNavigation", icon: IconNavigation },
  { name: "IconNews", icon: IconNews },
  { name: "IconMessage2Question", icon: IconMessage2Question },
  { name: "IconMessage2Search", icon: IconMessage2Search },
  { name: "IconMessage2Bolt", icon: IconMessage2Bolt },
  { name: "IconMessage2Star", icon: IconMessage2Star },
  { name: "IconMessage2Dollar", icon: IconMessage2Dollar },
  { name: "IconMedal", icon: IconMedal },
  { name: "IconMasksTheater", icon: IconMasksTheater },
  { name: "IconMarkdown", icon: IconMarkdown },
  { name: "IconCode", icon: IconCode },
  { name: "IconScript", icon: IconScript },
  { name: "IconFilter", icon: IconFilter },
  { name: "IconStethoscope", icon: IconStethoscope },
  { name: "IconMessages", icon: IconMessage },
  { name: "IconMail", icon: IconMail },
  { name: "IconBinaryTree2", icon: IconBinaryTree2 },
  { name: "IconFlag", icon: IconFlag },
  { name: "IconFlame", icon: IconFlame },
  { name: "IconFlask", icon: IconFlask },
];

export default function IconPicker({ value, onChange, ...props }) {
  const Icons = ALL_ICONS.map((IconObj, index) => (
    <ActionIcon
      key={index}
      onClick={() => {
        onChange(IconObj.name);
      }}
      variant="light"
    >
      <IconObj.icon
        size={18}
        className={`cursor-pointer ${
          IconObj.name === value ? "text-blue-500" : "text-gray-500"
        }`}
      />
    </ActionIcon>
  ));

  const CurrentIconObj = ALL_ICONS.find((IconObj) => IconObj.name === value);

  return (
    <Popover width={270} withArrow shadow="md" keepMounted={false}>
      <Popover.Target>
        <ActionIcon variant="light" {...props}>
          {CurrentIconObj && <CurrentIconObj.icon size={17} />}
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown style={{ maxHeight: 260, overflowY: "auto" }}>
        <Flex wrap="wrap" gap="sm" justify="space-between">
          {Icons}
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
}

export function getIconComponent(iconName) {
  const IconObj = ALL_ICONS.find((IconObj) => IconObj.name === iconName);
  return IconObj ? IconObj.icon : IconStack2;
}
