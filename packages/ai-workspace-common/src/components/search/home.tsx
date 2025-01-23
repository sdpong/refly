import { useEffect } from 'react';
import { Command } from 'cmdk';
import { IconApps, IconFolderAdd } from '@arco-design/web-react/icon';

import './index.scss';
import { Item } from './item';

import { RenderItem } from '@refly-packages/ai-workspace-common/components/search/types';
import { useTranslation } from 'react-i18next';

export function Home({
  pages,
  setPages,
  displayMode,
  data,
  activeValue,
  searchValue,
  setValue,
}: {
  data: RenderItem[];
  pages: string[];
  setPages: (pages: string[]) => void;
  displayMode: 'list' | 'search';
  activeValue: string;
  searchValue: string;
  setValue: (val: string) => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    setValue('refly-built-in-ask-ai');
  }, []);

  return (
    <>
      {data
        .filter((item) => item?.data?.length > 0)
        .map((renderItem, index) => (
          <Command.Group heading={renderItem?.heading} key={index}>
            {renderItem?.data?.slice(0, 5)?.map((item, index) => (
              <Item
                key={index}
                value={`${renderItem?.domain}-${index}-${item?.title}-${item?.snippets?.[0]?.text || ''}`}
                activeValue={activeValue}
                onSelect={() => {
                  renderItem?.onItemClick(item);
                }}
              >
                {renderItem?.icon}
                <div className="search-res-container">
                  <p
                    className="search-res-title"
                    dangerouslySetInnerHTML={{ __html: item?.highlightedTitle }}
                  ></p>
                  {item?.snippets?.length > 0 &&
                    item.snippets.map((snippet, index) => (
                      <p
                        className="search-res-desc"
                        key={index}
                        dangerouslySetInnerHTML={{ __html: snippet.highlightedText }}
                      ></p>
                    ))}
                </div>
              </Item>
            ))}
            {displayMode === 'list' && renderItem?.data?.length > 0 ? (
              <Item
                value={`all${renderItem?.domain}`}
                keywords={['']}
                onSelect={() => {
                  setPages([...pages, renderItem?.domain]);
                }}
                activeValue={activeValue}
              >
                <IconApps style={{ fontSize: 12 }} />
                {t('loggedHomePage.quickSearch.home.showAll', { heading: renderItem?.heading })}
              </Item>
            ) : null}
            {renderItem?.action ? (
              <Item
                value={`create ${renderItem?.domain}`}
                keywords={[`create ${renderItem?.domain}`]}
                onSelect={() => {
                  renderItem?.onCreateClick();
                }}
                activeValue={activeValue}
              >
                <IconFolderAdd style={{ fontSize: 12 }} />
                {renderItem?.actionHeading?.create}
              </Item>
            ) : null}
          </Command.Group>
        ))}
    </>
  );
}
